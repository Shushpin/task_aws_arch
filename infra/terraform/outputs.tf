output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnets" {
  value = [
    aws_subnet.public_1a.id,
    aws_subnet.public_1b.id
  ]
}

output "private_app_subnets" {
  value = [
    aws_subnet.private_app_1a.id,
    aws_subnet.private_app_1b.id
  ]
}

output "private_data_subnets" {
  value = [
    aws_subnet.private_data_1a.id,
    aws_subnet.private_data_1b.id
  ]
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "rds_port" {
  value = aws_db_instance.postgres.port
}

output "rds_database" {
  value = aws_db_instance.postgres.db_name
}