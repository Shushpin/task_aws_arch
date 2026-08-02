data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    actions = [
      "sts:AssumeRole"
    ]

    principals {
      type = "Service"

      identifiers = [
        "ecs-tasks.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {

  name = "catalog-ecs-execution-role"

  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = merge(local.common_tags, {
    Name = "catalog-ecs-execution-role"
  })
}

resource "aws_iam_role" "ecs_task" {

  name = "catalog-ecs-task-role"

  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = merge(local.common_tags, {
    Name = "catalog-ecs-task-role"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {

  role = aws_iam_role.ecs_execution.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}