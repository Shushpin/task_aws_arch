resource "aws_db_subnet_group" "main" {
  name = "catalog-db-subnet-group"

  subnet_ids = [
    aws_subnet.private_data_1a.id,
    aws_subnet.private_data_1b.id
  ]

  tags = merge(local.common_tags, {
    Name = "catalog-db-subnet-group"
  })
}

variable "db_name" {
  type    = string
  default = "catalogdb"
}

variable "db_username" {
  type    = string
  default = "catalog_admin"
}

variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_db_instance" "postgres" {
  identifier = "catalog-postgres"

  engine = "postgres"

  instance_class = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false

  multi_az = false

  skip_final_snapshot = true
  deletion_protection = false

  backup_retention_period = 1

  tags = merge(local.common_tags, {
    Name = "catalog-postgres"
  })
}