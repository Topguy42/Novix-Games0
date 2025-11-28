#!/bin/bash
# Network Namespace IPv6 Isolation
# Creates isolated network contexts for each proxy session

set -e

ROUTED_PREFIX="2001:470:8:5ac"
NAMESPACE_PREFIX="proxy-ns-"

# Function to create a new namespace with unique IPv6
create_proxy_namespace() {
    local ns_id=$1
    local ns_name="${NAMESPACE_PREFIX}${ns_id}"
    local ipv6_suffix=$(printf "%04x:%04x:%04x:%04x" $RANDOM $RANDOM $RANDOM $RANDOM)
    local ipv6_addr="${ROUTED_PREFIX}::${ipv6_suffix}"
    
    echo "Creating namespace: $ns_name with IPv6: $ipv6_addr"
    
    # Create namespace
    ip netns add $ns_name 2>/dev/null || true
    
    # Create veth pair
    ip link add veth-${ns_id} type veth peer name veth-${ns_id}-ns
    
    # Move one end to namespace
    ip link set veth-${ns_id}-ns netns $ns_name
    
    # Configure host side
    ip link set veth-${ns_id} up
    ip -6 addr add ${ROUTED_PREFIX}::1/64 dev veth-${ns_id}
    
    # Configure namespace side
    ip netns exec $ns_name ip link set lo up
    ip netns exec $ns_name ip link set veth-${ns_id}-ns up
    ip netns exec $ns_name ip -6 addr add ${ipv6_addr}/64 dev veth-${ns_id}-ns
    ip netns exec $ns_name ip -6 route add default via ${ROUTED_PREFIX}::1
    
    echo "$ipv6_addr"
}

# Function to delete namespace
delete_proxy_namespace() {
    local ns_id=$1
    local ns_name="${NAMESPACE_PREFIX}${ns_id}"
    
    echo "Deleting namespace: $ns_name"
    
    # Delete veth pair (automatically removes both ends)
    ip link del veth-${ns_id} 2>/dev/null || true
    
    # Delete namespace
    ip netns del $ns_name 2>/dev/null || true
}

# Cleanup all proxy namespaces
cleanup_all() {
    echo "Cleaning up all proxy namespaces..."
    for ns in $(ip netns list | grep "^${NAMESPACE_PREFIX}" | awk '{print $1}'); do
        local ns_id=${ns#$NAMESPACE_PREFIX}
        delete_proxy_namespace $ns_id
    done
}

# Main
case "${1:-}" in
    create)
        create_proxy_namespace ${2:-$(date +%s)}
        ;;
    delete)
        delete_proxy_namespace ${2}
        ;;
    cleanup)
        cleanup_all
        ;;
    *)
        echo "Usage: $0 {create|delete|cleanup} [namespace-id]"
        exit 1
        ;;
esac