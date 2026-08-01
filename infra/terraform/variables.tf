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