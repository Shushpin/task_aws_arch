resource "aws_lb" "main" {

  name = "catalog-alb"

  load_balancer_type = "application"

  internal = false

  security_groups = [
    aws_security_group.alb.id
  ]

  subnets = [
    aws_subnet.public_1a.id,
    aws_subnet.public_1b.id
  ]

  tags = merge(local.common_tags, {
    Name = "catalog-alb"
  })
}

resource "aws_lb_target_group" "catalog" {

  name = "catalog-tg"

  port = 3000

  protocol = "HTTP"

  target_type = "ip"

  vpc_id = aws_vpc.main.id

  health_check {

    path = "/live"
    
    protocol = "HTTP"

    matcher = "200"

    interval = 30

    timeout = 5

    healthy_threshold = 2

    unhealthy_threshold = 2
  }

  tags = merge(local.common_tags, {
    Name = "catalog-tg"
  })
}

resource "aws_lb_listener" "http" {

  load_balancer_arn = aws_lb.main.arn

  port = 80

  protocol = "HTTP"

  default_action {

    type = "forward"

    target_group_arn = aws_lb_target_group.catalog.arn
  }
}