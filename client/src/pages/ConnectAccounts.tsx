import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  CreditCard, 
  DollarSign, 
  BarChart4, 
  Home, 
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  category: "banking" | "accounting" | "property" | "payments";
  description: string;
  benefits: string[];
  trustScore: number;
  icon: React.ReactNode;
}

const services: Service[] = [
  {
    id: "mercury",
    name: "Mercury Bank",
    category: "banking",
    description: "Banking for startups and property businesses",
    benefits: ["Real-time cash flow tracking", "Automated categorization", "Multi-property accounts"],
    trustScore: 98,
    icon: <Building2 className="w-5 h-5" />
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Online payments and tenant billing",
    benefits: ["Accept rent payments online", "Recurring billing automation", "Payment analytics"],
    trustScore: 99,
    icon: <CreditCard className="w-5 h-5" />
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "accounting",
    description: "Accounting software for property managers",
    benefits: ["Expense tracking", "Financial reporting", "Tax preparation"],
    trustScore: 95,
    icon: <BarChart4 className="w-5 h-5" />
  },
  {
    id: "doorloop",
    name: "DoorLoop",
    category: "property",
    description: "Property management platform",
    benefits: ["Tenant management", "Maintenance tracking", "Lease management"],
    trustScore: 92,
    icon: <Home className="w-5 h-5" />
  }
];

export default function ConnectAccounts() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const categories = [
    { id: "banking", label: "Banking", icon: <Building2 className="w-6 h-6" />, description: "Connect your business bank accounts" },
    { id: "accounting", label: "Accounting", icon: <BarChart4 className="w-6 h-6" />, description: "Sync your accounting software" },
    { id: "property", label: "Property Management", icon: <Home className="w-6 h-6" />, description: "Connect property management tools" },
    { id: "payments", label: "Payments", icon: <CreditCard className="w-6 h-6" />, description: "Set up payment processing" }
  ];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentStep(2);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setCurrentStep(3);
  };

  const handleConnect = () => {
    window.location.href = `/api/integrations/connect/${selectedService?.id}`;
  };

  const filteredServices = selectedCategory 
    ? services.filter(s => s.category === selectedCategory)
    : services;

  return (
    <div className="container-apple py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2" data-testid="text-connect-title">
          Connect Services
        </h1>
        <p className="text-muted-foreground">
          Connect your financial services to get started
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all duration-200",
                  currentStep >= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
                data-testid={`step-indicator-${step}`}
              >
                {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
              </div>
              <p className="text-xs mt-2 font-medium">
                {step === 1 && "Category"}
                {step === 2 && "Service"}
                {step === 3 && "Connect"}
              </p>
            </div>
            {step < 3 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Category */}
      {currentStep === 1 && (
        <div className="max-w-4xl mx-auto fade-slide-in">
          <h2 className="text-2xl font-semibold mb-2 text-center">Choose a Category</h2>
          <p className="text-muted-foreground text-center mb-8">
            Select the type of service you want to connect
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategorySelect(category.id)}
                className="apple-card p-6 text-left interactive-card"
                data-testid={`category-${category.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select Service */}
      {currentStep === 2 && (
        <div className="max-w-4xl mx-auto fade-slide-in">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(1)}
            className="mb-6"
            data-testid="button-back"
          >
            ← Back to Categories
          </Button>
          
          <h2 className="text-2xl font-semibold mb-2">Select a Service</h2>
          <p className="text-muted-foreground mb-8">
            Choose from our trusted partners
          </p>
          
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceSelect(service)}
                className="apple-card p-6 w-full text-left interactive-card"
                data-testid={`service-${service.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      {service.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {service.trustScore}% Trust Score
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Key Benefits:</p>
                  <ul className="space-y-1">
                    {service.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Connect */}
      {currentStep === 3 && selectedService && (
        <div className="max-w-2xl mx-auto fade-slide-in">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(2)}
            className="mb-6"
            data-testid="button-back-services"
          >
            ← Back to Services
          </Button>
          
          <div className="apple-card p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                {selectedService.icon}
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                Connect {selectedService.name}
              </h2>
              <p className="text-muted-foreground">
                You're about to connect your {selectedService.name} account
              </p>
            </div>

            <div className="space-md mb-8">
              <div className="apple-card p-4 bg-muted/50">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium mb-1">What happens next?</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• You'll be redirected to {selectedService.name}</li>
                      <li>• Sign in securely to authorize access</li>
                      <li>• We'll sync your data automatically</li>
                      <li>• Your data is encrypted and secure</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>256-bit encryption • SOC 2 Type II certified</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                className="primary-cta flex-1"
                data-testid="button-connect"
              >
                Connect {selectedService.name}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Guidance */}
      <div className="sticky-guide mt-12" data-testid="card-connect-guidance">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(var(--sky))' }} />
          <div>
            <p className="font-medium mb-1">Need help?</p>
            <p className="text-muted-foreground">
              Our integrations are designed to work seamlessly with your existing workflow. 
              All connections are secure and you can disconnect at any time from Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
