resource "aws_elasticache_subnet_group" "main" {
  name = "catalog-redis-subnet-group"

  subnet_ids = [
    aws_subnet.private_data_1a.id,
    aws_subnet.private_data_1b.id
  ]

  tags = merge(local.common_tags, {
    Name = "catalog-redis-subnet-group"
  })
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id = "catalog-redis"

  engine = "redis"

  node_type = "cache.t4g.micro"

  num_cache_nodes = 1

  parameter_group_name = "default.redis7"

  port = 6379

  subnet_group_name = aws_elasticache_subnet_group.main.name

  security_group_ids = [
    aws_security_group.redis.id
  ]

  tags = merge(local.common_tags, {
    Name = "catalog-redis"
  })
}