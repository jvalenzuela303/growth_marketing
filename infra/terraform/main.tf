terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "growth-engine-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ─────────────────────────────────────────────
# Cloud SQL (PostgreSQL 16)
# ─────────────────────────────────────────────
resource "google_sql_database_instance" "main" {
  name             = "ge-postgres-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.db_tier  # db-standard-2 en producción
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = 20
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    maintenance_window {
      day          = 7  # Domingo
      hour         = 3  # 3 AM
      update_track = "stable"
    }
  }

  deletion_protection = var.environment == "prod"
}

resource "google_sql_database" "growth_engine" {
  name     = "growth_engine"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app_user" {
  name     = "ge_app"
  instance = google_sql_database_instance.main.name
  password = var.db_password
}

# ─────────────────────────────────────────────
# Memorystore Redis
# ─────────────────────────────────────────────
resource "google_redis_instance" "cache" {
  name           = "ge-redis-${var.environment}"
  memory_size_gb = 1
  region         = var.region
  redis_version  = "REDIS_7_0"

  authorized_network = google_compute_network.vpc.id

  labels = {
    environment = var.environment
    app         = "growth-engine"
  }
}

# ─────────────────────────────────────────────
# VPC (servicios internos no expuestos)
# ─────────────────────────────────────────────
resource "google_compute_network" "vpc" {
  name                    = "ge-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "ge-subnet-${var.environment}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# ─────────────────────────────────────────────
# Cloud Run Services
# ─────────────────────────────────────────────
module "backend_service" {
  source       = "./modules/cloud-run"
  name         = "ge-backend-${var.environment}"
  image        = var.backend_image
  region       = var.region
  min_instances = 1
  max_instances = 10
  memory        = "512Mi"
  port          = 3001
  env_vars = {
    NODE_ENV = var.environment
  }
  secret_env_vars = {
    DATABASE_URL    = "ge-database-url"
    REDIS_URL       = "ge-redis-url"
    ANTHROPIC_API_KEY = "ge-anthropic-key"
  }
}

module "ai_engine_service" {
  source        = "./modules/cloud-run"
  name          = "ge-ai-engine-${var.environment}"
  image         = var.ai_engine_image
  region        = var.region
  min_instances = 1
  max_instances = 5
  memory        = "1Gi"
  port          = 8000
  env_vars      = {}
  secret_env_vars = {
    ANTHROPIC_API_KEY = "ge-anthropic-key"
    OPENAI_API_KEY    = "ge-openai-key"
  }
}

module "frontend_service" {
  source        = "./modules/cloud-run"
  name          = "ge-frontend-${var.environment}"
  image         = var.frontend_image
  region        = var.region
  min_instances = 1
  max_instances = 20
  memory        = "1Gi"
  port          = 3000
  env_vars = {
    NODE_ENV   = "production"
    API_URL    = module.backend_service.url
    AI_ENGINE_URL = module.ai_engine_service.url
  }
  secret_env_vars = {
    NEXTAUTH_SECRET = "ge-nextauth-secret"
    META_PIXEL_ID   = "ge-meta-pixel"
    META_CAPI_TOKEN = "ge-meta-capi"
  }
}

# ─────────────────────────────────────────────
# Cloud Storage (PDFs de resultados, assets)
# ─────────────────────────────────────────────
resource "google_storage_bucket" "assets" {
  name          = "ge-assets-${var.project_id}-${var.environment}"
  location      = "US"
  force_destroy = var.environment != "prod"

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition { age = 365 }
    action { type = "SetStorageClass"; storage_class = "NEARLINE" }
  }
}

# ─────────────────────────────────────────────
# BigQuery Dataset para Analytics
# ─────────────────────────────────────────────
resource "google_bigquery_dataset" "analytics" {
  dataset_id                  = "growth_engine_analytics"
  friendly_name               = "Growth Engine Analytics"
  location                    = "US"
  default_table_expiration_ms = null  # Sin expiración — datos históricos críticos

  labels = {
    environment = var.environment
  }
}

# Tabla de eventos de leads
resource "google_bigquery_table" "lead_events" {
  dataset_id = google_bigquery_dataset.analytics.dataset_id
  table_id   = "lead_events"

  time_partitioning {
    type  = "DAY"
    field = "created_at"
  }

  clustering = ["tenant_id", "event_type"]

  schema = jsonencode([
    { name = "id", type = "STRING", mode = "REQUIRED" },
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "lead_id", type = "STRING", mode = "NULLABLE" },
    { name = "funnel_id", type = "STRING", mode = "NULLABLE" },
    { name = "event_type", type = "STRING", mode = "REQUIRED" },
    { name = "event_data", type = "JSON", mode = "NULLABLE" },
    { name = "created_at", type = "TIMESTAMP", mode = "REQUIRED" }
  ])
}

# ─────────────────────────────────────────────
# Budget Alerts (CRÍTICO — evitar sorpresas de factura)
# ─────────────────────────────────────────────
resource "google_billing_budget" "monthly_budget" {
  billing_account = var.billing_account_id
  display_name    = "Growth Engine MVP Monthly Budget"

  budget_filter {
    projects = ["projects/${var.project_id}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "600"  # $600 USD ≈ $570K CLP
    }
  }

  threshold_rules { threshold_percent = 0.5 }
  threshold_rules { threshold_percent = 0.75 }
  threshold_rules { threshold_percent = 0.9 }
  threshold_rules { threshold_percent = 1.0 }

  all_updates_rule {
    monitoring_notification_channels = [var.alert_notification_channel]
    disable_default_iam_recipients    = false
  }
}
