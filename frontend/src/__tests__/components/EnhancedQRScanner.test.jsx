import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedQRScanner from '../../components/EnhancedQRScanner';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../hooks/useGestures', () => ({
  useGestures: () => ({
    ref: { current: null },
    gestureState: { scale: 1, isZooming: false }
  })
}));

jest.mock('../../hooks/useOrientation', () => ({
  useQRScannerOrientation: () => ({
    orientation: { isPortrait: true, isLandscape: false },
    scannerConfig: {
      width: '100%',
      height: '400px',
      constraints: { width: { ideal: 720 }, height: { ideal: 1280 } }
    },
    enablePortraitLock: jest.fn(() => Promise.resolve(true)),
    disableOrientationLock: jest.fn(() => Promise.resolve(true))
  })
}));

jest.mock('../../utils/haptics', () => ({
  triggerHaptics: jest.fn(),
  HAPTIC_TYPES: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning'
  }
}));

// Mock QR Reader
jest.mock('react-qr-reader', () => {
  return {
    QrReader: ({ onResult, onError }) => (
      <div data-testid="qr-reader">
        <button 
          onClick={() => onResult({ text: 'test-qr-data' }, null)}
          data-testid="mock-scan-success"
        >
          Mock Scan Success
        </button>
        <button 
          onClick={() => onError(new Error('Camera not found'))}
          data-testid="mock-scan-error"
        >
          Mock Scan Error
        </button>
      </div>
    )
  };
});

// Mock media devices
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn(() => Promise.resolve([
    { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
    { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' }
  ]))
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices
});

describe('EnhancedQRScanner', () => {
  const defaultProps = {
    onScan: jest.fn(),
    onError: jest.fn(),
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    });
  });

  describe('Basic Functionality', () => {
    it('should render QR scanner when active', () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      expect(screen.getByTestId('qr-reader')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
    });

    it('should not render scanner when inactive', () => {
      render(<EnhancedQRScanner {...defaultProps} isActive={false} />);
      
      expect(screen.queryByTestId('qr-reader')).not.toBeInTheDocument();
    });

    it('should call onScan when QR code is detected', async () => {
      const mockOnScan = jest.fn();
      render(<EnhancedQRScanner {...defaultProps} onScan={mockOnScan} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      // Simulate successful scan
      const mockScanButton = screen.getByTestId('mock-scan-success');
      fireEvent.click(mockScanButton);
      
      await waitFor(() => {
        expect(mockOnScan).toHaveBeenCalledWith('test-qr-data');
      });
    });

    it('should call onError when scan fails', async () => {
      const mockOnError = jest.fn();
      render(<EnhancedQRScanner {...defaultProps} onError={mockOnError} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      // Simulate scan error
      const mockErrorButton = screen.getByTestId('mock-scan-error');
      fireEvent.click(mockErrorButton);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Camera Controls', () => {
    it('should start camera when start button is clicked', async () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: expect.objectContaining({
            facingMode: 'environment'
          })
        });
      });
      
      expect(screen.getByRole('button', { name: /stop camera/i })).toBeInTheDocument();
    });

    it('should stop camera when stop button is clicked', async () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop camera/i })).toBeInTheDocument();
      });
      
      // Stop camera
      const stopButton = screen.getByRole('button', { name: /stop camera/i });
      fireEvent.click(stopButton);
      
      expect(screen.getByRole('button', { name: /start camera/i })).toBeInTheDocument();
    });

    it('should switch between cameras', async () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /switch camera/i })).toBeInTheDocument();
      });
      
      const switchButton = screen.getByRole('button', { name: /switch camera/i });
      fireEvent.click(switchButton);
      
      // Should call getUserMedia again with different camera
      await waitFor(() => {
        expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
      });
    });

    it('should toggle torch when available', async () => {
      // Mock torch capability
      const mockTrack = {
        getCapabilities: () => ({ torch: true }),
        applyConstraints: jest.fn()
      };
      
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [mockTrack]
      });
      
      render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /toggle torch/i })).toBeInTheDocument();
      });
      
      const torchButton = screen.getByRole('button', { name: /toggle torch/i });
      fireEvent.click(torchButton);
      
      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: true }]
      });
    });
  });

  describe('Gesture Controls', () => {
    it('should support pinch to zoom', async () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      const scannerContainer = screen.getByTestId('qr-reader').parentElement;
      
      // Simulate pinch gesture
      fireEvent.touchStart(scannerContainer, {
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 }
        ]
      });
      
      fireEvent.touchMove(scannerContainer, {
        touches: [
          { clientX: 80, clientY: 80 },
          { clientX: 220, clientY: 220 }
        ]
      });
      
      fireEvent.touchEnd(scannerContainer);
      
      // Should update zoom level
      expect(scannerContainer).toHaveStyle({ transform: expect.stringContaining('scale') });
    });

    it('should support double tap to focus', async () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera first
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      const scannerContainer = screen.getByTestId('qr-reader').parentElement;
      
      // Simulate double tap
      fireEvent.touchStart(scannerContainer, {
        touches: [{ clientX: 150, clientY: 150 }]
      });
      fireEvent.touchEnd(scannerContainer);
      
      fireEvent.touchStart(scannerContainer, {
        touches: [{ clientX: 150, clientY: 150 }]
      });
      fireEvent.touchEnd(scannerContainer);
      
      // Should trigger focus action (implementation specific)
      await waitFor(() => {
        expect(screen.getByTestId('qr-reader')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /start camera/i })).toHaveAttribute('aria-label');
      expect(screen.getByTestId('qr-reader').parentElement).toHaveAttribute('role', 'application');
    });

    it('should announce scan results to screen readers', async () => {
      const mockOnScan = jest.fn();
      render(<EnhancedQRScanner {...defaultProps} onScan={mockOnScan} />);
      
      // Start camera
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      // Simulate successful scan
      const mockScanButton = screen.getByTestId('mock-scan-success');
      fireEvent.click(mockScanButton);
      
      await waitFor(() => {
        // Should have live region announcement
        expect(screen.getByText(/qr code detected/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', () => {
      render(<EnhancedQRScanner {...defaultProps} />);
      
      const startButton = screen.getByRole('button', { name: /start camera/i });
      
      // Should be focusable
      startButton.focus();
      expect(startButton).toHaveFocus();
      
      // Should activate with Enter key
      fireEvent.keyDown(startButton, { key: 'Enter' });
      expect(startButton).toHaveTextContent(/stop camera/i);
    });
  });

  describe('Performance', () => {
    it('should handle rapid scan attempts gracefully', async () => {
      const mockOnScan = jest.fn();
      render(<EnhancedQRScanner {...defaultProps} onScan={mockOnScan} />);
      
      // Start camera
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      const mockScanButton = screen.getByTestId('mock-scan-success');
      
      // Simulate rapid scans
      for (let i = 0; i < 10; i++) {
        fireEvent.click(mockScanButton);
      }
      
      await waitFor(() => {
        // Should debounce and only process valid scans
        expect(mockOnScan).toHaveBeenCalledTimes(1);
      });
    });

    it('should clean up resources on unmount', () => {
      const mockStop = jest.fn();
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: mockStop }]
      });
      
      const { unmount } = render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      // Unmount component
      unmount();
      
      // Should stop camera stream
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle camera permission denied', async () => {
      const mockOnError = jest.fn();
      mockMediaDevices.getUserMedia.mockRejectedValue(
        new Error('Permission denied')
      );
      
      render(<EnhancedQRScanner {...defaultProps} onError={mockOnError} />);
      
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
        expect(screen.getByText(/camera permission denied/i)).toBeInTheDocument();
      });
    });

    it('should handle no camera available', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([]);
      
      render(<EnhancedQRScanner {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no camera available/i)).toBeInTheDocument();
      });
    });

    it('should gracefully handle torch not supported', async () => {
      const mockTrack = {
        getCapabilities: () => ({}), // No torch capability
        applyConstraints: jest.fn()
      };
      
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [mockTrack]
      });
      
      render(<EnhancedQRScanner {...defaultProps} />);
      
      // Start camera
      const startButton = screen.getByRole('button', { name: /start camera/i });
      fireEvent.click(startButton);
      
      await waitFor(() => {
        // Torch button should not be available
        expect(screen.queryByRole('button', { name: /toggle torch/i })).not.toBeInTheDocument();
      });
    });
  });
});