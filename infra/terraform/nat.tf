data "aws_ami" "fck_nat" {
  most_recent = true

  owners = ["568608671756"]

  filter {
    name   = "name"
    values = ["fck-nat-al2023-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-fck-nat-eip"
    }
  )
}

resource "aws_security_group" "nat" {
  name        = "catalog-fck-nat-sg"
  description = "Security Group for fck-nat instance"
  vpc_id      = aws_vpc.main.id

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-fck-nat-sg"
    }
  )
}


resource "aws_vpc_security_group_egress_rule" "nat_all" {
  security_group_id = aws_security_group.nat.id

  ip_protocol = "-1"

  cidr_ipv4 = "0.0.0.0/0"

  description = "Allow all outbound traffic"
}

resource "aws_instance" "nat" {

  ami           = data.aws_ami.fck_nat.id
  instance_type = var.nat_instance_type

  subnet_id = aws_subnet.public_1a.id

  vpc_security_group_ids = [
    aws_security_group.nat.id
  ]

  iam_instance_profile = aws_iam_instance_profile.nat.name

  source_dest_check = false

  associate_public_ip_address = true

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-fck-nat"
    }
  )
}

resource "aws_eip_association" "nat" {

  allocation_id = aws_eip.nat.id

  instance_id = aws_instance.nat.id
}

resource "aws_vpc_security_group_ingress_rule" "nat_from_vpc" {
  security_group_id = aws_security_group.nat.id

  ip_protocol = "-1"

  cidr_ipv4 = var.vpc_cidr

  description = "Allow traffic from VPC to NAT"
}