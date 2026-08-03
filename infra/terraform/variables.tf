variable "project_name" {
  default = "catalog"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "region" {
  default = "eu-central-1"
}

variable "availability_zones" {
  description = "Availability Zones"
  type        = list(string)

  default = [
    "eu-central-1a",
    "eu-central-1b"
  ]
}

variable "environment" {
  default = "dev"
}

variable "nat_instance_type" {
  description = "Instance type for fck-nat"
  type        = string
  default     = "t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "catalogdb"
}

variable "db_username" {
  description = "PostgreSQL admin username"
  type        = string
  default     = "catalog_admin"
}

variable "db_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "eu-central-1"
}