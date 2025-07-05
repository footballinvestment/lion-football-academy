# Lion Football Academy Design System

A comprehensive UI component library built for the Lion Football Academy management platform. This design system provides consistent, accessible, and responsive components following the academy's brand guidelines.

## Design Tokens

### Brand Colors
- **Primary**: `#2c5530` (Lion Green)
- **Secondary**: `#f8b500` (Lion Gold)
- **Accent**: `#ff6b35` (Lion Orange)

### Role-Based Gradients
- **Admin**: Dark green gradient
- **Coach**: Gold gradient
- **Player**: Orange gradient
- **Parent**: Light green gradient

## Components

### Button
Versatile button component with multiple variants and states.

```jsx
import { Button } from '../ui';

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="accent">Accent</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// With icons
<Button leftIcon={<Icon />}>With Icon</Button>

// Loading state
<Button loading>Loading...</Button>

// Role-specific
<Button variant="admin">Admin Action</Button>
```

### Card
Flexible card component for content organization.

```jsx
import { Card } from '../ui';

// Basic card
<Card>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
  </Card.Header>
  <Card.Body>
    <Card.Text>Card content goes here.</Card.Text>
  </Card.Body>
  <Card.Footer>
    Footer content
  </Card.Footer>
</Card>

// With variants
<Card variant="primary" hoverable>
  Hoverable primary card
</Card>

// Role-specific
<Card variant="coach">
  Coach-specific card
</Card>
```

### Modal
Accessible modal component with focus management.

```jsx
import { Modal } from '../ui';

const [isOpen, setIsOpen] = useState(false);

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <Modal.Header onClose={() => setIsOpen(false)}>
    <Modal.Title>Modal Title</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    Modal content
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </Modal.Footer>
</Modal>
```

### Tabs
Keyboard-navigable tabs component.

```jsx
import { Tabs } from '../ui';

<Tabs defaultTab={0}>
  <Tabs.TabPanel title="Tab 1" icon={<Icon />}>
    Content for tab 1
  </Tabs.TabPanel>
  <Tabs.TabPanel title="Tab 2" badge="3">
    Content for tab 2
  </Tabs.TabPanel>
  <Tabs.TabPanel title="Tab 3" disabled>
    Content for tab 3
  </Tabs.TabPanel>
</Tabs>
```

### StatCard
Dashboard statistics card with trend indicators.

```jsx
import { StatCard } from '../ui';

<StatCard.Group columns={4}>
  <StatCard
    title="Total Players"
    value={145}
    trend="up"
    trendValue="+12%"
    trendLabel="vs last month"
    variant="primary"
    icon={<PlayersIcon />}
  />
  <StatCard
    title="Matches Won"
    value="85%"
    trend="up"
    trendValue="+5%"
    variant="success"
    icon={<TrophyIcon />}
  />
</StatCard.Group>
```

### LoadingSpinner
Multiple loading animation variants.

```jsx
import { LoadingSpinner } from '../ui';

// Basic spinner
<LoadingSpinner />

// Different variants
<LoadingSpinner.Dots />
<LoadingSpinner.Pulse />
<LoadingSpinner.Bars />

// With overlay
<LoadingSpinner overlay message="Loading data..." />

// Different sizes and colors
<LoadingSpinner size="lg" variant="primary" />
```

### Alert
Notification component with auto-hide and dismiss functionality.

```jsx
import { Alert } from '../ui';

// Basic alerts
<Alert variant="success">Operation completed successfully!</Alert>
<Alert variant="error" dismissible>
  Something went wrong. Please try again.
</Alert>

// With title and auto-hide
<Alert 
  variant="info" 
  title="Information" 
  autoHide 
  autoHideDelay={3000}
>
  This message will disappear in 3 seconds.
</Alert>

// Alert manager for multiple alerts
const alerts = [
  { id: 1, variant: 'success', message: 'Success message' },
  { id: 2, variant: 'error', message: 'Error message' }
];

<Alert.Manager alerts={alerts} position="top-right" />
```

## Accessibility Features

All components are built with accessibility in mind:

- **Keyboard Navigation**: Full keyboard support for all interactive components
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Logical focus flow and visible focus indicators
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects user's motion preferences

## Responsive Design

Components automatically adapt to different screen sizes:

- **Mobile-first**: Optimized for mobile devices
- **Breakpoints**: Consistent breakpoint system
- **Touch-friendly**: Appropriate touch targets on mobile
- **Flexible Layouts**: Components adapt to available space

## Theming

### CSS Custom Properties
All design tokens are available as CSS custom properties:

```css
:root {
  --lion-primary: #2c5530;
  --lion-secondary: #f8b500;
  --lion-accent: #ff6b35;
  /* ... more variables */
}
```

### Dark Mode
Built-in dark mode support through CSS custom properties.

### Role-based Styling
Components can be styled based on user roles:

```jsx
<Button variant="admin">Admin Button</Button>
<Card variant="coach">Coach Card</Card>
<StatCard variant="player">Player Stats</StatCard>
```

## Best Practices

1. **Import Components**: Use named imports from the ui directory
2. **Accessibility**: Always provide meaningful labels and descriptions
3. **Performance**: Use loading states for better user experience
4. **Consistency**: Stick to the design system variants and sizes
5. **Testing**: Test components across different devices and screen readers

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding new components:

1. Follow the existing naming conventions
2. Include all size variants (sm, base, lg)
3. Add proper TypeScript/PropTypes
4. Include CSS custom properties for theming
5. Ensure accessibility compliance
6. Add responsive styles
7. Test with screen readers
8. Update this documentation