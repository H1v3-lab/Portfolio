# Ephemeral hacking lab — one command spins up a disposable, deliberately vulnerable VM
# with a web terminal, and it self-destructs after a TTL. DevSecOps / IaC demo for the
# portfolio. See lab/README.md.
#
# Safety model: the box is throwaway and short-lived; it exposes an intentionally vulnerable
# target plus a web shell. Lock `allowed_cidr` to your own IP, and never put real data on it.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# Latest Amazon Linux 2023 AMI (x86_64).
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "lab" {
  name_prefix = "sakoi-lab-"
  description = "Ephemeral lab — web terminal + vulnerable target"

  ingress {
    description = "Web terminal (ttyd)"
    from_port   = 7681
    to_port     = 7681
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  ingress {
    description = "Vulnerable target (Juice Shop)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]
  }
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}

resource "aws_instance" "lab" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.lab.id]

  # The whole point: the box terminates itself when it powers off, and cloud-init
  # schedules that power-off at TTL. No cleanup job, no leftover resources.
  instance_initiated_shutdown_behavior = "terminate"

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    ttl_minutes  = var.ttl_minutes
    target_image = var.target_image
  })

  tags = local.tags
}

locals {
  tags = {
    Project   = "sakoi-cyber-lab"
    Ephemeral = "true"
    TTL       = "${var.ttl_minutes}m"
  }
}
