#!/bin/bash

echo "🔍 VNC Connection Diagnostics"
printf '=%.0s' {1..50}; echo

# System információk
echo "💻 System Information:"
echo "OS: $(uname -s)"
echo "Kernel: $(uname -r)" 
echo "Architecture: $(uname -m)"
echo "Date: $(date)"
echo

# VNC process ellenőrzése
echo "🖥️  VNC Processes:"
VNC_PROCESSES=$(ps aux | grep -i vnc | grep -v grep)
if [ -n "$VNC_PROCESSES" ]; then
    echo "$VNC_PROCESSES"
else
    echo "❌ No VNC processes found"
fi
echo

# Screen Sharing process ellenőrzése (macOS)
echo "📺 Screen Sharing Processes (macOS):"
SCREEN_PROCESSES=$(ps aux | grep -i "screensharing\|vnc" | grep -v grep)
if [ -n "$SCREEN_PROCESSES" ]; then
    echo "$SCREEN_PROCESSES"
else
    echo "❌ No Screen Sharing processes found"  
fi
echo

# VNC portok ellenőrzése
echo "🔌 VNC Ports (5900-5910):"
VNC_PORTS=$(netstat -an | grep LISTEN | grep -E ':59[0-9][0-9]')
if [ -n "$VNC_PORTS" ]; then
    echo "✅ VNC ports detected:"
    echo "$VNC_PORTS"
else
    echo "❌ No VNC ports found listening"
fi
echo

# SSH service ellenőrzése
echo "🔐 SSH Service Status:"
SSH_PORT=$(netstat -an | grep LISTEN | grep :22)
if [ -n "$SSH_PORT" ]; then
    echo "✅ SSH is listening:"
    echo "$SSH_PORT"
else
    echo "❌ SSH port 22 not listening"
fi

# SSH client
if command -v ssh &> /dev/null; then
    echo "✅ SSH client available: $(ssh -V 2>&1)"
else
    echo "❌ SSH client not found"
fi
echo

# macOS Screen Sharing ellenőrzése
echo "🖼️  macOS Screen Sharing:"
if [[ "$(uname -s)" == "Darwin" ]]; then
    SHARING_STATUS=$(launchctl list | grep screensharing)
    if [ -n "$SHARING_STATUS" ]; then
        echo "✅ Screen Sharing services:"
        echo "$SHARING_STATUS"
    else
        echo "❌ Screen Sharing services not found"
    fi
    
    # System Preferences Screen Sharing check
    if defaults read com.apple.ScreenSharing StartServiceEnabled 2>/dev/null >/dev/null; then
        SHARING_ENABLED=$(defaults read com.apple.ScreenSharing StartServiceEnabled 2>/dev/null)
        echo "Screen Sharing in System Preferences: $SHARING_ENABLED"
    fi
else
    echo "Not running on macOS"
fi
echo

# Network interfaces
echo "🌐 Network Interfaces:"
if command -v ip &> /dev/null; then
    ip addr show 2>/dev/null | grep inet
elif command -v ifconfig &> /dev/null; then
    ifconfig 2>/dev/null | grep inet
else
    echo "❌ No network command available"
fi
echo

# VNC config fájlok ellenőrzése
echo "📁 VNC Configuration:"
if [ -d ~/.vnc ]; then
    echo "✅ VNC config directory found:"
    ls -la ~/.vnc/
    echo
    if [ -f ~/.vnc/xstartup ]; then
        echo "📄 VNC startup script content:"
        cat ~/.vnc/xstartup
    fi
else
    echo "❌ No VNC config found in ~/.vnc/"
fi
echo

# Display változók
echo "🖼️  Display Environment:"
echo "DISPLAY: ${DISPLAY:-'Not set'}"
echo "XDG_SESSION_TYPE: ${XDG_SESSION_TYPE:-'Not set'}"
echo "TERM: ${TERM:-'Not set'}"
echo

# macOS specifikus információk
if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "🍎 macOS Specific:"
    echo "Remote Login (SSH): $(systemsetup -getremotelogin 2>/dev/null)"
    echo "Screen Sharing: $(defaults read com.apple.ScreenSharing StartServiceEnabled 2>/dev/null || echo 'Not configured')"
    echo
fi

# Kapcsolódási tesztek
echo "🧪 Connection Tests:"
echo "Testing localhost VNC connection..."
if command -v nc &> /dev/null; then
    if nc -z localhost 5900 2>/dev/null; then
        echo "✅ VNC port 5900 is accessible locally"
    else
        echo "❌ VNC port 5900 not accessible locally"
    fi
else
    echo "⚠️  netcat not available for port testing"
fi
echo

# Hibaelhárítási javaslatok
echo "🚀 Quick Fix Commands:"
echo "================================"
echo
echo "📋 Common VNC Issues & Solutions:"
echo
echo "1️⃣  If VNC not running:"
echo "   macOS: Enable Screen Sharing in System Preferences > Sharing"
echo "   Linux: vncserver :1 -geometry 1920x1080 -depth 24"
echo
echo "2️⃣  If connection refused:"
echo "   Check firewall: sudo ufw status (Linux)"
echo "   Check port: netstat -an | grep :5900"
echo
echo "3️⃣  If authentication failed:"
echo "   Reset VNC password: vncpasswd (Linux)"
echo "   macOS: Check Screen Sharing password in System Preferences"
echo
echo "4️⃣  SSH Tunnel setup:"
echo "   ssh -L 5901:localhost:5900 username@remote-host"
echo "   Then connect to: localhost:5901"
echo
echo "5️⃣  Alternative - VS Code Remote:"
echo "   Install 'Remote - SSH' extension"
echo "   Connect via Command Palette: Remote-SSH: Connect to Host"
echo
echo "🔧 Debug Commands:"
echo "   • View VNC logs: cat ~/.vnc/*.log"
echo "   • Test local VNC: open vnc://localhost"
echo "   • Check processes: ps aux | grep vnc"
echo "   • Kill VNC: vncserver -kill :1 (Linux)"
echo
echo "📞 Support Resources:"
echo "   • macOS: System Preferences > Sharing > Screen Sharing"
echo "   • Linux VNC: https://help.ubuntu.com/community/VNC"
echo "   • SSH Tunneling: man ssh"

printf '=%.0s' {1..50}; echo
echo "🏁 Diagnostics Complete!"