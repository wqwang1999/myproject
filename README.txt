
在云服务器上开启网关（云服务器平台的网关也要关闭）
sudo sed -i 's/#GatewayPorts no/GatewayPorts yes/' /etc/ssh/sshd_config
AllowTcpForwarding yes
sudo systemctl restart sshd
放行5001端口（如果开启了防火墙）
Ubuntu：
sudo ufw allow 5001/tcp
CentOS：
firewall-cmd --add-port=5001/tcp --permanent
#sudo firewall-cmd --permanent --add-port=5001/tcp
sudo firewall-cmd --reload
####查看防火墙状态
systemctl status firewalld
####如果不想启动防火墙服务，可以暂时关闭（不推荐生产环境）：
sudo systemctl stop firewalld
sudo systemctl disable firewalld
####如果希望启用并使用 firewalld（CentOS/RHEL）：
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-port=8080/tcp    # 将 8080 换为你要映射的远程端口
sudo firewall-cmd --reload
####查看防火墙已放行的端口CentOS：
firewall-cmd --list-ports
####查看端口占用情况
netstat -tlnp | grep :5001


本地shell执行（将本地 5001 暴露到服务器的公网 5001）
ssh -N -R 0.0.0.0:5001:localhost:5001 root@39.96.210.211
 ssh -vvv -N -R 0.0.0.0:5173:127.0.0.1:5173 -o ServerAliveInterval=30 root@39.96.210.211 2>&1 | grep -i "channel\|forward\|error\|listen"
# 或强制 IPv4 （建议使用此，否则可能连不上）0.0.0.0:5001 是本地 127.0.0.1:5001是服务器
ssh -v -o AddressFamily=inet -N -R 0.0.0.0:5001:127.0.0.1:5001 root@39.96.210.211(本地执行这个就行)

ssh -R 0.0.0.0:8080:localhost:5001 user@39.96.210.211 -N
# 或后台运行
ssh -f -N -R 0.0.0.0:8080:localhost:5001 user@39.96.210.211
#### ssh -N -L 8080:192.168.1.100:8080 user@39.96.210.211
-L 参数定义本地端口转发规则。如果你必须用 -L（本地正向），那只能通过本地 127.0.0.1:5001 访问；远程访问服务器 IP 不会命中该隧道。
说明：
-R 0.0.0.0:8080:localhost:5001 表示把服务器的 0.0.0.0:8080 转发到你本地的 `localhost:5001`