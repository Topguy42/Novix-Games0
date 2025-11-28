#!/bin/bash
# HE.net Tunnel Setup Script
# Run as root

set -e

TUNNEL_NAME="he-ipv6"
SERVER_IPV4="216.66.22.2"
CLIENT_IPV4="62.72.3.251"
CLIENT_IPV6="2001:470:7:5ac::2"
SERVER_IPV6="2001:470:7:5ac::1"
ROUTED_PREFIX="2001:470:8:5ac::/64"

echo "Setting up HE.net IPv6 tunnel..."

# Remove existing tunnel if present
ip tunnel del $TUNNEL_NAME 2>/dev/null || true

# Create the tunnel
ip tunnel add $TUNNEL_NAME mode sit remote $SERVER_IPV4 local $CLIENT_IPV4 ttl 255

# Bring up the interface
ip link set $TUNNEL_NAME up

# Assign client IPv6 address
ip addr add $CLIENT_IPV6/64 dev $TUNNEL_NAME

# Add route for tunnel endpoint
ip route add ::/0 dev $TUNNEL_NAME

# Configure the routed /64 prefix on a physical interface (eth0, ens3, etc)
# Replace 'eth0' with your actual interface name
INTERFACE="eth0"

# Add the first address from your routed prefix
ip -6 addr add 2001:470:8:5ac::1/64 dev $INTERFACE

# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl -w net.ipv6.conf.default.forwarding=1

# Enable accept_ra for dynamic configuration
sysctl -w net.ipv6.conf.$INTERFACE.accept_ra=2
sysctl -w net.ipv6.conf.$TUNNEL_NAME.accept_ra=2

# Add routing for the /64 prefix
ip -6 route add $ROUTED_PREFIX dev $INTERFACE metric 1

echo "Tunnel setup complete!"
echo "Testing connectivity..."

# Test connectivity
ping6 -c 3 2001:470:20::2

echo ""
echo "Configuration:"
echo "  Tunnel Interface: $TUNNEL_NAME"
echo "  Routed Prefix: $ROUTED_PREFIX"
echo "  Primary Address: 2001:470:8:5ac::1"
echo ""
echo "To persist this configuration, add to /etc/network/interfaces or systemd-networkd"