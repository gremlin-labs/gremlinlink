'use client';

export function ThemeTest() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Theme Test Component</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Background Test */}
        <div className="p-4 bg-background border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Background Colors</h3>
          <div className="space-y-2">
            <div className="p-2 bg-card text-card-foreground rounded">Card Background</div>
            <div className="p-2 bg-muted text-muted-foreground rounded">Muted Background</div>
            <div className="p-2 bg-accent text-accent-foreground rounded">Accent Background</div>
          </div>
        </div>

        {/* Primary Colors Test */}
        <div className="p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold text-card-foreground mb-2">Primary Colors</h3>
          <div className="space-y-2">
            <div className="p-2 bg-primary text-primary-foreground rounded">Primary</div>
            <div className="p-2 bg-secondary text-secondary-foreground rounded">Secondary</div>
            <div className="p-2 bg-destructive text-destructive-foreground rounded">Destructive</div>
          </div>
        </div>

        {/* Text Colors Test */}
        <div className="p-4 bg-muted border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">Text Colors</h3>
          <div className="space-y-1">
            <p className="text-foreground">Foreground Text</p>
            <p className="text-muted-foreground">Muted Foreground</p>
            <p className="text-primary">Primary Text</p>
            <p className="text-accent">Accent Text</p>
          </div>
        </div>

        {/* Border Test */}
        <div className="p-4 bg-card border-2 border-border rounded-lg">
          <h3 className="font-semibold text-card-foreground mb-2">Borders</h3>
          <div className="space-y-2">
            <div className="p-2 border border-border rounded">Default Border</div>
            <div className="p-2 border border-primary rounded">Primary Border</div>
            <div className="p-2 border border-muted rounded">Muted Border</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <p className="text-foreground">
          <strong>Test Instructions:</strong> Click the theme toggle button to switch between light and dark modes. 
          All colors above should change appropriately. If only some colors change, there&apos;s still an issue with the theme system.
        </p>
      </div>
    </div>
  );
} 