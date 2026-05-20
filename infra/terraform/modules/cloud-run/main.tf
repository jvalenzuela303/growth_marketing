variable "name" {}
variable "image" {}
variable "region" {}
variable "min_instances" { default = 1 }
variable "max_instances" { default = 10 }
variable "memory" { default = "512Mi" }
variable "port" { default = 8080 }
variable "env_vars" { type = map(string); default = {} }
variable "secret_env_vars" { type = map(string); default = {} }

resource "google_cloud_run_v2_service" "service" {
  name     = var.name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image
      ports { container_port = var.port }

      resources {
        limits = {
          memory = var.memory
          cpu    = "1"
        }
        cpu_idle = false  # CPU siempre activo cuando min_instances > 0
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }
}

# Permitir acceso público sin autenticación (auth manejada por la app)
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.service.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "url" {
  value = google_cloud_run_v2_service.service.uri
}
