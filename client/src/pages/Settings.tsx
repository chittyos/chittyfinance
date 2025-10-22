import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Integration, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, Bell, Link2, Accessibility, Save } from "lucide-react";

export default function Settings() {
  const [hasChanges, setHasChanges] = useState(false);
  
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/session"],
  });

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const handleSave = () => {
    setHasChanges(false);
  };

  return (
    <div className="container-apple py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account preferences and integrations
        </p>
      </div>

      {/* Content - Single Column Layout */}
      <div className="max-w-3xl space-lg">
        
        {/* Profile Section */}
        <section className="apple-card p-6 fade-slide-in" data-testid="section-profile">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Your personal information
              </p>
            </div>
          </div>
          
          {isLoadingUser ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-md">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input 
                  id="name" 
                  defaultValue={user?.displayName} 
                  placeholder="Your name"
                  onChange={() => setHasChanges(true)}
                  data-testid="input-display-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={user?.email} 
                  placeholder="your@email.com"
                  onChange={() => setHasChanges(true)}
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  This is where you'll receive important notifications
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input 
                  id="role" 
                  defaultValue={user?.role} 
                  placeholder="Property Manager"
                  onChange={() => setHasChanges(true)}
                  data-testid="input-role"
                />
              </div>
            </div>
          )}
        </section>

        {/* Integrations Section */}
        <section className="apple-card p-6 fade-slide-in" data-testid="section-integrations">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Connected Services</h2>
              <p className="text-sm text-muted-foreground">
                Manage your financial integrations
              </p>
            </div>
          </div>
          
          {isLoadingIntegrations ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {integrations?.slice(0, 5).map((integration) => (
                <div 
                  key={integration.id} 
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-all duration-200"
                  data-testid={`integration-${integration.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {integration.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium" data-testid={`text-integration-name-${integration.id}`}>
                        {integration.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {integration.description || integration.serviceType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch 
                      id={`integration-${integration.id}`} 
                      checked={integration.connected ?? false}
                      data-testid={`switch-integration-${integration.id}`}
                    />
                    <span className={`text-sm font-medium ${
                      integration.connected ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {integration.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                data-testid="button-add-integration"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </div>
          )}
        </section>

        {/* Notifications Section */}
        <section className="apple-card p-6 fade-slide-in" data-testid="section-notifications">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-sky/10 flex items-center justify-center">
              <Bell className="w-5 h-5" style={{ color: 'hsl(var(--sky))' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Choose what you want to be notified about
              </p>
            </div>
          </div>
          
          <div className="space-md">
            <NotificationToggle
              id="property-alerts"
              title="Property Alerts"
              description="Get notified about maintenance requests and tenant issues"
              defaultChecked
            />
            
            <Separator />
            
            <NotificationToggle
              id="payment-reminders"
              title="Payment Reminders"
              description="Reminders when rent payments are due or overdue"
              defaultChecked
            />
            
            <Separator />
            
            <NotificationToggle
              id="ai-insights"
              title="AI Insights"
              description="Proactive recommendations from your AI assistant"
              defaultChecked
            />
            
            <Separator />
            
            <NotificationToggle
              id="expense-notifications"
              title="Expense Notifications"
              description="Alerts about unusual spending or cost-saving opportunities"
              defaultChecked
            />
          </div>
        </section>

        {/* Accessibility Section */}
        <section className="apple-card p-6 fade-slide-in" data-testid="section-accessibility">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Accessibility className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Accessibility</h2>
              <p className="text-sm text-muted-foreground">
                Customize your experience for better focus
              </p>
            </div>
          </div>
          
          <div className="space-md">
            <NotificationToggle
              id="focus-mode-default"
              title="Enable Focus Mode by Default"
              description="Automatically dim non-essential cards to help you concentrate"
            />
            
            <Separator />
            
            <NotificationToggle
              id="reduce-motion"
              title="Reduce Motion"
              description="Minimize animations and transitions"
            />
            
            <Separator />
            
            <NotificationToggle
              id="high-contrast"
              title="High Contrast Mode"
              description="Increase color contrast for better visibility"
            />
          </div>
        </section>
      </div>

      {/* Persistent Save Bar - ADHD Friendly */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="apple-card px-6 py-4 shadow-xl flex items-center gap-4">
            <p className="text-sm font-medium">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setHasChanges(false)}
                data-testid="button-discard"
              >
                Discard
              </Button>
              <Button 
                size="sm" 
                className="primary-cta"
                onClick={handleSave}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationToggleProps {
  id: string;
  title: string;
  description: string;
  defaultChecked?: boolean;
}

function NotificationToggle({ id, title, description, defaultChecked }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between py-2" data-testid={`toggle-${id}`}>
      <div className="flex-1">
        <Label htmlFor={id} className="text-base font-medium cursor-pointer">
          {title}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>
      <Switch 
        id={id} 
        defaultChecked={defaultChecked}
        data-testid={`switch-${id}`}
      />
    </div>
  );
}
