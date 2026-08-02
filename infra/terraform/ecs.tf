resource "aws_ecs_cluster" "main" {

  name = "catalog-cluster"

  tags = merge(local.common_tags, {
    Name = "catalog-cluster"
  })
}
resource "aws_cloudwatch_log_group" "ecs" {

  name = "/ecs/catalog"

  retention_in_days = 14

  tags = merge(local.common_tags, {
    Name = "catalog-logs"
  })
}