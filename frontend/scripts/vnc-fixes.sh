#!/bin/bash

echo "🔧 VNC Quick Fixes & Solutions"
printf '=%.0s' {1..50}; echo

# Function to check if running on macOS
is_macos() {
    [[ "$(uname -s)" == "Darwin" ]]
}

# Function to check if running on Linux
is_linux() {
    [[ "$(uname -s)" == "Linux" ]]
}

# Menu system
show_menu() {
    echo
    echo "🛠️  VNC Troubleshooting Menu:"
    echo "1) 🔍 Run Full Diagnostics"
    echo "2) 🔄 Restart VNC Service"
    echo "3) 🔐 Reset VNC Password" 
    echo "4) 🌐 Setup SSH Tunnel"
    echo "5) 🧪 Test VNC Connection"
    echo "6) 📝 Show VNC Logs"
    echo "7) 🍎 macOS Screen Sharing Setup"
    echo "8) 🐧 Linux VNC Server Setup"
    echo "9) 📱 VS Code Remote Setup Guide"
    echo "0) ❌ Exit"
    echo
    read -p "Choose an option (0-9): " choice
}

# 1. Run diagnostics
run_diagnostics() {
    echo "🔍 Running VNC Diagnostics..."
    if [ -f "$(dirname "$0")/vnc-diagnostics.sh" ]; then
        "$(dirname "$0")/vnc-diagnostics.sh"
    else
        echo "❌ Diagnostics script not found!"
    fi
}

# 2. Restart VNC Service
restart_vnc() {
    echo "🔄 Restarting VNC Service..."
    
    if is_macos; then
        echo "🍎 macOS Screen Sharing restart..."
        sudo launchctl stop com.apple.screensharing 2>/dev/null
        sleep 2
        sudo launchctl start com.apple.screensharing 2>/dev/null
        echo "✅ macOS Screen Sharing restarted"
        
    elif is_linux; then
        echo "🐧 Linux VNC restart..."
        # Kill existing VNC servers
        vncserver -kill :1 2>/dev/null
        vncserver -kill :2 2>/dev/null
        sleep 2
        # Start new VNC server
        vncserver :1 -geometry 1920x1080 -depth 24
        echo "✅ Linux VNC server restarted on display :1"
        
    else
        echo "❌ Unsupported operating system"
    fi
}

# 3. Reset VNC Password
reset_vnc_password() {
    echo "🔐 Resetting VNC Password..."
    
    if is_macos; then
        echo "🍎 For macOS Screen Sharing:"
        echo "1. Go to System Preferences > Sharing"
        echo "2. Select Screen Sharing"
        echo "3. Click 'Computer Settings...' button"
        echo "4. Set/change the VNC password"
        echo "5. Click OK and ensure Screen Sharing is enabled"
        
    elif is_linux; then
        echo "🐧 Setting Linux VNC password..."
        vncpasswd
        echo "✅ VNC password updated"
        
    else
        echo "❌ Unsupported operating system"
    fi
}

# 4. Setup SSH Tunnel
setup_ssh_tunnel() {
    echo "🌐 SSH Tunnel Setup..."
    echo
    read -p "Enter remote hostname/IP: " remote_host
    read -p "Enter username: " username
    read -p "Enter local port (default 5901): " local_port
    local_port=${local_port:-5901}
    
    echo
    echo "Creating SSH tunnel..."
    echo "Command: ssh -L ${local_port}:localhost:5900 ${username}@${remote_host}"
    echo
    echo "To connect:"
    echo "1. Run the SSH command above in a terminal"
    echo "2. Open VNC viewer and connect to: localhost:${local_port}"
    echo
    read -p "Run SSH tunnel now? (y/N): " run_tunnel
    
    if [[ $run_tunnel =~ ^[Yy]$ ]]; then
        echo "🚀 Starting SSH tunnel... (Press Ctrl+C to stop)"
        ssh -L ${local_port}:localhost:5900 ${username}@${remote_host}
    fi
}

# 5. Test VNC Connection
test_vnc_connection() {
    echo "🧪 Testing VNC Connection..."
    
    # Test port 5900
    if command -v nc &> /dev/null; then
        if nc -z localhost 5900 2>/dev/null; then
            echo "✅ VNC port 5900 is accessible"
        else
            echo "❌ VNC port 5900 is not accessible"
        fi
    fi
    
    # Test with built-in VNC client (macOS)
    if is_macos; then
        echo
        read -p "Test VNC connection to localhost? (y/N): " test_local
        if [[ $test_local =~ ^[Yy]$ ]]; then
            echo "🚀 Opening VNC connection..."
            open vnc://localhost
        fi
    fi
}

# 6. Show VNC Logs
show_vnc_logs() {
    echo "📝 VNC Logs..."
    
    if is_linux && [ -d ~/.vnc ]; then
        echo "🐧 Linux VNC Logs:"
        ls -la ~/.vnc/*.log 2>/dev/null
        echo
        latest_log=$(ls -t ~/.vnc/*.log 2>/dev/null | head -1)
        if [ -n "$latest_log" ]; then
            echo "📄 Latest log content:"
            tail -20 "$latest_log"
        fi
        
    elif is_macos; then
        echo "🍎 macOS Screen Sharing logs:"
        echo "Check Console.app for Screen Sharing related logs"
        echo "Or run: log show --predicate 'subsystem contains \"screensharing\"' --last 1h"
        
    else
        echo "❌ No VNC logs found"
    fi
}

# 7. macOS Screen Sharing Setup
macos_setup() {
    if ! is_macos; then
        echo "❌ This option is only for macOS"
        return
    fi
    
    echo "🍎 macOS Screen Sharing Setup Guide"
    echo
    echo "1️⃣  Enable Screen Sharing:"
    echo "   • System Preferences > Sharing"
    echo "   • Check 'Screen Sharing'"
    echo
    echo "2️⃣  Configure Access:"
    echo "   • All users: Select 'All users'"
    echo "   • Specific users: Select 'Only these users' and add users"
    echo
    echo "3️⃣  Set VNC Password (optional):"
    echo "   • Click 'Computer Settings...'"
    echo "   • Check 'VNC viewers may control screen with password'"
    echo "   • Set password"
    echo
    echo "4️⃣  Check Status:"
    current_status=$(defaults read com.apple.ScreenSharing StartServiceEnabled 2>/dev/null || echo "false")
    echo "   • Current status: $current_status"
    echo
    echo "5️⃣  Quick Enable via Terminal:"
    echo "   sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist"
}

# 8. Linux VNC Server Setup
linux_setup() {
    if ! is_linux; then
        echo "❌ This option is only for Linux"
        return
    fi
    
    echo "🐧 Linux VNC Server Setup"
    echo
    echo "1️⃣  Install VNC Server:"
    echo "   Ubuntu/Debian: sudo apt update && sudo apt install tightvncserver"
    echo "   CentOS/RHEL: sudo yum install tigervnc-server"
    echo
    echo "2️⃣  Set VNC Password:"
    echo "   vncpasswd"
    echo
    echo "3️⃣  Create/Edit Startup Script:"
    echo "   ~/.vnc/xstartup"
    echo
    echo "4️⃣  Sample xstartup content:"
    cat << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
EOF
    echo
    echo "5️⃣  Start VNC Server:"
    echo "   vncserver :1 -geometry 1920x1080 -depth 24"
    echo
    read -p "Create sample xstartup file? (y/N): " create_startup
    if [[ $create_startup =~ ^[Yy]$ ]]; then
        mkdir -p ~/.vnc
        cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
exec startxfce4
EOF
        chmod +x ~/.vnc/xstartup
        echo "✅ Created ~/.vnc/xstartup"
    fi
}

# 9. VS Code Remote Setup Guide
vscode_remote_guide() {
    echo "📱 VS Code Remote Development Setup"
    echo
    echo "1️⃣  Install VS Code Extensions:"
    echo "   • Remote - SSH"
    echo "   • Remote - SSH: Editing Configuration Files"
    echo
    echo "2️⃣  Setup SSH Connection:"
    echo "   • Ctrl+Shift+P (Cmd+Shift+P on Mac)"
    echo "   • Type: 'Remote-SSH: Connect to Host'"
    echo "   • Enter: username@hostname"
    echo
    echo "3️⃣  SSH Key Setup (recommended):"
    echo "   ssh-keygen -t rsa -b 4096"
    echo "   ssh-copy-id username@hostname"
    echo
    echo "4️⃣  Port Forwarding in VS Code:"
    echo "   • Open Ports panel in VS Code"
    echo "   • Click 'Forward a Port'"
    echo "   • Enter port (e.g., 3000 for React dev server)"
    echo
    echo "5️⃣  Benefits over VNC:"
    echo "   • Better performance"
    echo "   • Integrated terminal"
    echo "   • File synchronization"
    echo "   • Extensions work remotely"
}

# Main loop
main() {
    while true; do
        show_menu
        
        case $choice in
            1) run_diagnostics ;;
            2) restart_vnc ;;
            3) reset_vnc_password ;;
            4) setup_ssh_tunnel ;;
            5) test_vnc_connection ;;
            6) show_vnc_logs ;;
            7) macos_setup ;;
            8) linux_setup ;;
            9) vscode_remote_guide ;;
            0) echo "👋 Goodbye!"; exit 0 ;;
            *) echo "❌ Invalid option. Please choose 0-9." ;;
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