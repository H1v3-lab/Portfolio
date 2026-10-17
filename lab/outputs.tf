output "public_ip" {
  description = "Public IP of the ephemeral lab."
  value       = aws_instance.lab.public_ip
}

output "web_terminal_url" {
  description = "Browser-based shell (ttyd). Give it ~90s after apply to come up."
  value       = "http://${aws_instance.lab.public_ip}:7681"
}

output "target_url" {
  description = "The deliberately vulnerable target to attack."
  value       = "http://${aws_instance.lab.public_ip}:3000"
}

output "self_destruct_in" {
  description = "The lab terminates itself after this long."
  value       = "${var.ttl_minutes} minutes"
}
