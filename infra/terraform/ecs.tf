data "aws_caller_identity" "current" {}

resource "aws_ecs_cluster" "main" {
  name = "catalog-cluster"

  tags = merge(local.common_tags, {
    Name = "catalog-cluster"
  })
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/catalog"
  retention_in_days = 14

  tags = merge(local.common_tags, {
    Name = "catalog-logs"
  })
}

resource "aws_ecs_task_definition" "catalog" {

  family = "catalog"

  network_mode = "awsvpc"

  requires_compatibilities = ["FARGATE"]

  cpu = 256

  memory = 512

  execution_role_arn = aws_iam_role.ecs_execution.arn

  task_role_arn = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name = "catalog-list-service"

      image = "114171679692.dkr.ecr.eu-central-1.amazonaws.com/catalog-list-service:v5"

      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "catalog"
        }
      }

      environment = [
  {
    name  = "NODE_ENV"
    value = "production"
  },
  {
    name  = "DATABASE_URL"
    value = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
  },
  {
    name  = "REDIS_URL"
    value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
  }
]
    }
  ])
}