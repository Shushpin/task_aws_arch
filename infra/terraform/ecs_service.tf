resource "aws_ecs_service" "catalog" {
  name = "catalog-service"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.catalog.arn

  desired_count = 1

  launch_type = "FARGATE"

  network_configuration {
    subnets = [
      aws_subnet.private_app_1a.id,
      aws_subnet.private_app_1b.id
    ]

    security_groups = [
      aws_security_group.ecs.id
    ]

    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.catalog.arn

    container_name = "catalog-list-service"

    container_port = 3000
  }

  depends_on = [
    aws_lb_listener.http
  ]

  tags = merge(local.common_tags, {
    Name = "catalog-service"
  })
}