#!/bin/bash

echo "🌐 SSH Tunnel Helper for VNC/Development"
printf '=%.0s' {1..50}; echo

# Configuration file
CONFIG_FILE="$HOME/.ssh/dev-tunnels.conf"

# Function to save tunnel configuration
save_tunnel_config() {
    local name="$1"
    local local_port="$2" 
    local remote_host="$3"
    local remote_port="$4"
    local username="$5"
    
    echo "# $name" >> "$CONFIG_FILE"
    echo "LocalPort=$local_port" >> "$CONFIG_FILE"
    echo "RemoteHost=$remote_host" >> "$CONFIG_FILE"  
    echo "RemotePort=$remote_port" >> "$CONFIG_FILE"
    echo "Username=$username" >> "$CONFIG_FILE"
    echo "Command=ssh -L $local_port:localhost:$remote_port $username@$remote_host" >> "$CONFIG_FILE"
    echo "" >> "$CONFIG_FILE"
}

# Function to list saved configurations
list_configs() {
    if [ -f "$CONFIG_FILE" ]; then
        echo "📋 Saved Tunnel Configurations:"
        echo "================================"
        grep "^# " "$CONFIG_FILE" | sed 's/^# //'
    else
        echo "❌ No saved configurations found"
    fi
}

# Function to create VNC tunnel
create_vnc_tunnel() {
    echo "🖥️  VNC Tunnel Setup"
    echo "==================="
    
    read -p "Remote hostname/IP: " remote_host
    read -p "Username: " username
    read -p "Local port (default 5901): " local_port
    read -p "Remote VNC port (default 5900): " remote_port
    read -p "Configuration name: " config_name
    
    local_port=${local_port:-5901}
    remote_port=${remote_port:-5900}
    config_name=${config_name:-"VNC-$(date +%Y%m%d)"}
    
    echo
    echo "🔧 Tunnel Configuration:"
    echo "Local port: $local_port"
    echo "Remote: $username@$remote_host:$remote_port"
    echo "Command: ssh -L $local_port:localhost:$remote_port $username@$remote_host"
    echo
    
    read -p "Save this configuration? (y/N): " save_config
    if [[ $save_config =~ ^[Yy]$ ]]; then
        mkdir -p "$(dirname "$CONFIG_FILE")"
        save_tunnel_config "$config_name" "$local_port" "$remote_host" "$remote_port" "$username"
        echo "✅ Configuration saved as '$config_name'"
    fi
    
    echo
    read -p "Start tunnel now? (y/N): " start_now
    if [[ $start_now =~ ^[Yy]$ ]]; then
        echo "🚀 Starting VNC tunnel..."
        echo "After connection, use VNC client to connect to: localhost:$local_port"
        echo "Press Ctrl+C to stop tunnel"
        ssh -L $local_port:localhost:$remote_port $username@$remote_host
    fi
}

# Function to create development server tunnel
create_dev_tunnel() {
    echo "💻 Development Server Tunnel"
    echo "============================="
    
    read -p "Remote hostname/IP: " remote_host
    read -p "Username: " username
    read -p "Local port (default 3000): " local_port
    read -p "Remote dev server port (default 3000): " remote_port
    read -p "Configuration name: " config_name
    
    local_port=${local_port:-3000}
    remote_port=${remote_port:-3000}  
    config_name=${config_name:-"DevServer-$(date +%Y%m%d)"}
    
    echo
    echo "🔧 Development Tunnel Configuration:"
    echo "Local port: $local_port"
    echo "Remote: $username@$remote_host:$remote_port"
    echo "Access URL: http://localhost:$local_port"
    echo
    
    read -p "Save this configuration? (y/N): " save_config
    if [[ $save_config =~ ^[Yy]$ ]]; then
        mkdir -p "$(dirname "$CONFIG_FILE")"
        save_tunnel_config "$config_name" "$local_port" "$remote_host" "$remote_port" "$username"
        echo "✅ Configuration saved as '$config_name'"
    fi
    
    echo
    read -p "Start tunnel now? (y/N): " start_now
    if [[ $start_now =~ ^[Yy]$ ]]; then
        echo "🚀 Starting development tunnel..."
        echo "Open browser to: http://localhost:$local_port"
        echo "Press Ctrl+C to stop tunnel"
        ssh -L $local_port:localhost:$remote_port $username@$remote_host
    fi
}

# Function to create multi-port tunnel
create_multi_tunnel() {
    echo "🔀 Multi-Port Tunnel Setup"
    echo "=========================="
    
    read -p "Remote hostname/IP: " remote_host
    read -p "Username: " username
    
    echo
    echo "Common development ports:"
    echo "3000 - React Dev Server"
    echo "5000 - Flask/Express API"
    echo "5432 - PostgreSQL"
    echo "3306 - MySQL"
    echo "5900 - VNC"
    echo
    
    ports=()
    while true; do
        read -p "Enter port to forward (local:remote, or 'done'): " port_pair
        if [[ $port_pair == "done" ]]; then
            break
        fi
        
        if [[ $port_pair =~ ^[0-9]+:[0-9]+$ ]]; then
            ports+=("$port_pair")
            echo "✅ Added: $port_pair"
        else
            echo "❌ Invalid format. Use local:remote (e.g., 3000:3000)"
        fi
    done
    
    if [ ${#ports[@]} -eq 0 ]; then
        echo "❌ No ports configured"
        return
    fi
    
    echo
    echo "🔧 Multi-Port Tunnel Configuration:"
    ssh_command="ssh"
    for port in "${ports[@]}"; do
        local_port="${port%:*}"
        remote_port="${port#*:}"
        ssh_command="$ssh_command -L $local_port:localhost:$remote_port"
        echo "  $local_port -> $remote_port"
    done
    ssh_command="$ssh_command $username@$remote_host"
    
    echo
    echo "Command: $ssh_command"
    echo
    
    read -p "Start multi-port tunnel? (y/N): " start_now
    if [[ $start_now =~ ^[Yy]$ ]]; then
        echo "🚀 Starting multi-port tunnel..."
        echo "Press Ctrl+C to stop tunnel"
        eval "$ssh_command"
    fi
}

# Function to test SSH connection
test_ssh_connection() {
    echo "🧪 SSH Connection Test"
    echo "====================="
    
    read -p "Remote hostname/IP: " remote_host
    read -p "Username: " username
    
    echo
    echo "Testing SSH connection..."
    
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "$username@$remote_host" exit 2>/dev/null; then
        echo "✅ SSH connection successful"
    else
        echo "❌ SSH connection failed"
        echo
        echo "🔧 Troubleshooting tips:"
        echo "1. Check if SSH service is running on remote host"
        echo "2. Verify username and hostname"
        echo "3. Check SSH key authentication:"
        echo "   ssh-copy-id $username@$remote_host"
        echo "4. Test with password authentication:"
        echo "   ssh -o PreferredAuthentications=password $username@$remote_host"
    fi
}

# Function to generate SSH key
generate_ssh_key() {
    echo "🔑 SSH Key Generation"
    echo "===================="
    
    if [ -f ~/.ssh/id_rsa ]; then
        echo "⚠️  SSH key already exists at ~/.ssh/id_rsa"
        read -p "Generate new key anyway? (y/N): " generate_new
        if [[ ! $generate_new =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    read -p "Email for key comment: " email
    email=${email:-"$(whoami)@$(hostname)"}
    
    echo "🔨 Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -C "$email"
    
    echo
    echo "✅ SSH key generated!"
    echo "📋 Public key:"
    cat ~/.ssh/id_rsa.pub
    echo
    echo "🚀 To enable passwordless login:"
    echo "ssh-copy-id username@remote-host"
}

# Menu system
show_menu() {
    echo
    echo "🛠️  SSH Tunnel Helper Menu:"
    echo "1) 🖥️  Setup VNC Tunnel"
    echo "2) 💻 Setup Development Server Tunnel" 
    echo "3) 🔀 Setup Multi-Port Tunnel"
    echo "4) 📋 List Saved Configurations"
    echo "5) 🧪 Test SSH Connection"
    echo "6) 🔑 Generate SSH Key"
    echo "7) 📚 Show Usage Examples"
    echo "0) ❌ Exit"
    echo
    read -p "Choose an option (0-7): " choice
}

# Show usage examples
show_examples() {
    echo "📚 SSH Tunnel Usage Examples"
    echo "============================"
    echo
    echo "1️⃣  VNC Tunnel:"
    echo "   ssh -L 5901:localhost:5900 user@remote-server"
    echo "   Connect VNC to: localhost:5901"
    echo
    echo "2️⃣  Web Development:"
    echo "   ssh -L 3000:localhost:3000 user@remote-server"
    echo "   Access app at: http://localhost:3000"
    echo
    echo "3️⃣  Database Access:"
    echo "   ssh -L 5432:localhost:5432 user@remote-server"
    echo "   Connect DB client to: localhost:5432"
    echo
    echo "4️⃣  Background Tunnel:"
    echo "   ssh -f -N -L 5901:localhost:5900 user@remote-server"
    echo "   (-f: background, -N: no command execution)"
    echo
    echo "5️⃣  Multiple Ports:"
    echo "   ssh -L 3000:localhost:3000 -L 5432:localhost:5432 user@remote-server"
    echo
    echo "6️⃣  Kill Background Tunnels:"
    echo "   ps aux | grep ssh"
    echo "   kill PID"
}

# Main loop
main() {
    echo "🌐 SSH Tunnel Helper for Development"
    echo "Simplifying remote development workflows"
    
    while true; do
        show_menu
        
        case $choice in
            1) create_vnc_tunnel ;;
            2) create_dev_tunnel ;;
            3) create_multi_tunnel ;;
            4) list_configs ;;
            5) test_ssh_connection ;;
            6) generate_ssh_key ;;
            7) show_examples ;;
            0) echo "👋 Goodbye!"; exit 0 ;;
            *) echo "❌ Invalid option. Please choose 0-7." ;;
        esac
        
        echo
        read -p "Press Enter to continue..."
        clear
    done
}

# Check if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi