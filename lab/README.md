# Ephemeral hacking lab (Terraform)

One command spins up a **disposable, deliberately vulnerable VM** with a browser-based
shell, and it **self-destructs after a TTL** (default 30 min). It's a DevSecOps / IaC
demo: infrastructure-as-code, a short-lived blast radius, and no manual cleanup.

```
terraform apply  →  EC2 (Amazon Linux 2023)
                    ├─ docker: bkimminich/juice-shop  (vulnerable target, :3000)
                    ├─ docker: ttyd                   (web terminal, :7681)
                    └─ shutdown -h +TTL  +  terminate-on-shutdown  →  self-destruct
```

## Why it's safe-ish

- The box is **throwaway and short-lived**; put no real data on it.
- `instance_initiated_shutdown_behavior = "terminate"` + a cloud-init `shutdown -h +TTL`
  means the VM **terminates itself** at the TTL — no cron on your laptop, no leftover
  resources, no forgotten bill.
- **Lock `allowed_cidr` to `YOUR_IP/32`** so the open target and the web shell are reachable
  only by you.

## Use

Prereqs: Terraform ≥ 1.5 and AWS credentials (`aws configure`, or env vars). `t3.micro`
is Free Tier eligible in most regions.

```sh
cd lab
cp terraform.tfvars.example terraform.tfvars   # set allowed_cidr to YOUR_IP/32
terraform init
terraform apply                                # prints the URLs

# ~90 s later:
#   web_terminal_url = http://<ip>:7681   (shell in the browser)
#   target_url       = http://<ip>:3000   (Juice Shop — attack this)

# It self-destructs at TTL. To tear down early:
terraform destroy
```

## Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `region` | `eu-west-3` | Any AWS region. |
| `instance_type` | `t3.micro` | Free Tier eligible in most regions. |
| `ttl_minutes` | `30` | 5–240. The VM powers off (and terminates) after this. |
| `allowed_cidr` | `0.0.0.0/0` | **Set to `YOUR_IP/32`.** |
| `target_image` | `bkimminich/juice-shop` | Swap for any vulnerable-app image (DVWA, WebGoat…). |

## Adapting to another cloud

The design (short-lived VM + cloud-init + terminate-on-shutdown) ports cleanly:
- **Oracle Cloud Always Free** (the honeypot already runs there): use the `oci` provider,
  an `oci_core_instance`, and a cloud-init that runs the same containers; for self-destruct,
  a systemd timer that calls the OCI CLI to terminate the instance at TTL.
- **GCP / Azure**: equivalent compute + startup-script + a self-delete at TTL via the
  instance's own service account.

This module ships the AWS variant because it's the most portable to read; the IaC pattern
is the transferable part.
