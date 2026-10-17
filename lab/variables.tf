variable "region" {
  description = "AWS region to deploy the lab in."
  type        = string
  default     = "eu-west-3"
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro is Free Tier eligible in most regions)."
  type        = string
  default     = "t3.micro"
}

variable "ttl_minutes" {
  description = "Lifetime of the lab, in minutes, before it self-destructs."
  type        = number
  default     = 30

  validation {
    condition     = var.ttl_minutes >= 5 && var.ttl_minutes <= 240
    error_message = "ttl_minutes must be between 5 and 240."
  }
}

variable "allowed_cidr" {
  description = "CIDR allowed to reach the lab. Lock this to YOUR_IP/32 — do not leave it open."
  type        = string
  default     = "0.0.0.0/0"
}

variable "target_image" {
  description = "Docker image of the vulnerable target to practise against."
  type        = string
  default     = "bkimminich/juice-shop"
}
