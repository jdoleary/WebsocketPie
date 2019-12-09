# Notes

## Docker / Ec2

```sh
ssh -i C:\Users\jdo\.ssh\aws-ec2-2.pem ec2-user@ec2-54-226-209-107.compute-1.amazonaws.com
sudo service docker start
aws ecr get-login --region us-east-1
docker pull 505590197138.dkr.ecr.us-east-1.amazonaws.com/echo-server:echo-server
docker run --name pie -p 8080:8080/tcp 58cbb1d792c4
```
