resource "aws_subnet" "public_1a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = var.availability_zones[0]
  map_public_ip_on_launch = true


  tags = merge(
    local.common_tags,
    {
      Name = "catalog-public-1a"
      Type = "public"
    }
  )
}

resource "aws_subnet" "public_1b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = var.availability_zones[1]
  map_public_ip_on_launch = true

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-public-1b"
      Type = "public"
    }
  )
}

resource "aws_subnet" "private_app_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = var.availability_zones[0]

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-app-1a"
      Type = "private-app"
    }
  )
}

resource "aws_subnet" "private_app_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = var.availability_zones[1]

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-app-1b"
      Type = "private-app"
    }
  )
}

resource "aws_subnet" "private_data_1a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.21.0/24"
  availability_zone = var.availability_zones[0]

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-data-1a"
      Type = "private-data"
    }
  )
}

resource "aws_subnet" "private_data_1b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.22.0/24"
  availability_zone = var.availability_zones[1]

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-data-1b"
      Type = "private-data"
    }
  )
}