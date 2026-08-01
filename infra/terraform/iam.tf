data "aws_iam_policy_document" "ec2_assume_role" {

  statement {

    effect = "Allow"

    principals {
      type = "Service"

      identifiers = [
        "ec2.amazonaws.com"
      ]
    }

    actions = [
      "sts:AssumeRole"
    ]
  }
}

resource "aws_iam_role" "nat" {

  name = "catalog-fck-nat-role"

  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = merge(
    local.common_tags,
    {
      Name = "catalog-fck-nat-role"
    }
  )
}

resource "aws_iam_role_policy_attachment" "nat_ssm" {

  role = aws_iam_role.nat.name

  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "nat" {

  name = "catalog-fck-nat-profile"

  role = aws_iam_role.nat.name
}