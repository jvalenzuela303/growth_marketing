variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment: dev, staging, prod"
  type        = string
  default     = "dev"
}

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"  # dev: micro | prod: db-standard-2
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "billing_account_id" {
  description = "GCP Billing Account ID for budget alerts"
  type        = string
  default     = ""
}

variable "alert_notification_channel" {
  description = "Cloud Monitoring notification channel for billing alerts"
  type        = string
  default     = ""
}

variable "backend_image" {
  description = "Docker image URI for the backend service"
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Docker image URI for the frontend service"
  type        = string
  default     = ""
}

variable "ai_engine_image" {
  description = "Docker image URI for the AI engine service"
  type        = string
  default     = ""
}
