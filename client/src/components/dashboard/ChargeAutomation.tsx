import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, Calendar, TrendingDown, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChargeDetails {
  id: string;
  merchantName: string;
  amount: number;
  date: Date;
  category: string;
  recurring: boolean;
  nextChargeDate?: Date;
  subscriptionId?: string;
}

interface OptimizationRecommendation {
  chargeId: string;
  merchantName: string;
  currentAmount: number;
  suggestedAction: 'cancel' | 'downgrade' | 'consolidate' | 'negotiate';
  potentialSavings: number;
  reasoning: string;
  alternativeOptions?: string[];
}

export default function ChargeAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('recurring');
  const [selectedCharge, setSelectedCharge] = useState<ChargeDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: recurringCharges, isLoading: isLoadingCharges } = useQuery<ChargeDetails[]>({
    queryKey: ['/api/charges/recurring'],
  });
  
  const { data: optimizations, isLoading: isLoadingOptimizations } = useQuery<OptimizationRecommendation[]>({
    queryKey: ['/api/charges/optimizations'],
  });
  
  const manageMutation = useMutation({
    mutationFn: async ({ chargeId, action }: { chargeId: string; action: 'cancel' | 'modify' }) => {
      return apiRequest('POST', '/api/charges/manage', { chargeId, action })
        .then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/charges/recurring'] });
      toast({
        title: "Success!",
        description: "The subscription has been updated successfully.",
      });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "There was a problem updating the subscription.",
        variant: "destructive",
      });
    }
  });
  
  const handleCancelSubscription = (charge: ChargeDetails) => {
    setSelectedCharge(charge);
    setIsDialogOpen(true);
  };
  
  const confirmCancelSubscription = () => {
    if (selectedCharge) {
      manageMutation.mutate({ 
        chargeId: selectedCharge.id, 
        action: 'cancel' 
      });
    }
  };
  
  const calculateTotalSavings = () => {
    if (!optimizations) return 0;
    return optimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0);
  };
  
  return (
    <div className="apple-card overflow-hidden" data-testid="card-charge-automation">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-1">Expense Optimization</h3>
            <p className="text-sm text-muted-foreground">
              Manage recurring property expenses
            </p>
          </div>
          {optimizations && optimizations.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">
                {formatCurrency(calculateTotalSavings())}/mo savings
              </span>
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="recurring" onValueChange={setSelectedTab}>
        <div className="px-6 pt-4">
          <TabsList className="segment-control w-full">
            <TabsTrigger 
              value="recurring" 
              className={selectedTab === 'recurring' ? 'segment-item active' : 'segment-item'}
              data-testid="tab-recurring"
            >
              Recurring Charges
            </TabsTrigger>
            <TabsTrigger 
              value="optimizations"
              className={selectedTab === 'optimizations' ? 'segment-item active' : 'segment-item'}
              data-testid="tab-optimizations"
            >
              Optimizations
              {optimizations && optimizations.length > 0 && (
                <Badge className="ml-2 bg-accent text-accent-foreground text-xs">
                  {optimizations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="p-6">
          <TabsContent value="recurring" className="m-0 space-y-3">
            {isLoadingCharges ? (
              <>
                <ChargeItemSkeleton />
                <ChargeItemSkeleton />
                <ChargeItemSkeleton />
              </>
            ) : recurringCharges && recurringCharges.length > 0 ? (
              recurringCharges.map(charge => (
                <div 
                  key={charge.id} 
                  className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-200"
                  data-testid={`charge-${charge.id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium" data-testid={`text-merchant-${charge.id}`}>
                          {charge.merchantName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {charge.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg" data-testid={`text-amount-${charge.id}`}>
                        {formatCurrency(charge.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(charge.date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Next: {charge.nextChargeDate ? formatDate(charge.nextChargeDate) : 'Unknown'}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelSubscription(charge)}
                      data-testid={`button-cancel-${charge.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No recurring charges found.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="optimizations" className="m-0 space-y-4">
            {!isLoadingOptimizations && optimizations && optimizations.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Potential Monthly Savings</p>
                    <p className="text-2xl font-semibold text-primary" data-testid="text-total-savings">
                      {formatCurrency(calculateTotalSavings())}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {isLoadingOptimizations ? (
                <>
                  <OptimizationItemSkeleton />
                  <OptimizationItemSkeleton />
                </>
              ) : optimizations && optimizations.length > 0 ? (
                optimizations.map(optimization => (
                  <div 
                    key={optimization.chargeId} 
                    className="p-4 rounded-xl border border-border bg-card"
                    data-testid={`optimization-${optimization.chargeId}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium mb-2" data-testid={`text-opt-merchant-${optimization.chargeId}`}>
                          {optimization.merchantName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                            {optimization.suggestedAction.toUpperCase()}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {optimization.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-medium">{formatCurrency(optimization.currentAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-muted-foreground">Savings:</span>
                      <span className="font-semibold text-primary" data-testid={`text-savings-${optimization.chargeId}`}>
                        {formatCurrency(optimization.potentialSavings)}
                      </span>
                    </div>
                    
                    {optimization.alternativeOptions && optimization.alternativeOptions.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">Alternative Options:</p>
                        <ul className="space-y-1">
                          {optimization.alternativeOptions.map((option, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{option}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        className="primary-cta flex-1"
                        size="sm"
                        data-testid={`button-apply-${optimization.chargeId}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Apply
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        data-testid={`button-ignore-${optimization.chargeId}`}
                      >
                        Ignore
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No optimization recommendations available.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription to {selectedCharge?.merchantName}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-dialog-cancel">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-dialog-confirm"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChargeItemSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-5 w-20 mb-2 ml-auto" />
          <Skeleton className="h-4 w-32 ml-auto" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-border">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

function OptimizationItemSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <Skeleton className="h-5 w-36 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </div>
    </div>
  );
}
