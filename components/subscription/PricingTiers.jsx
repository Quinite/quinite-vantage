'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Check,
    X,
    Sparkles,
    Rocket,
    Building2,
    Zap,
    Loader2,
    Users,
    FolderKanban,
    Megaphone,
    UserCheck,
    Clock,
    PlusCircle,
    FileDown,
    Globe,
    Plug,
    ScrollText,
    GitBranch,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => (n === -1 ? 'Unlimited' : n?.toLocaleString('en-IN') ?? '0');

function buildFeatureList(f = {}) {
    return [
        {
            icon: Users,
            text:
                f.max_users === -1
                    ? 'Unlimited users'
                    : `Up to ${fmt(f.max_users)} user${f.max_users !== 1 ? 's' : ''}`,
            included: true,
        },
        {
            icon: FolderKanban,
            text: f.max_projects === -1 ? 'Unlimited projects' : `${fmt(f.max_projects)} project${f.max_projects !== 1 ? 's' : ''}`,
            included: true,
        },
        {
            icon: Megaphone,
            text:
                f.max_campaigns === -1
                    ? 'Unlimited campaigns'
                    : `${fmt(f.max_campaigns)} campaign${f.max_campaigns !== 1 ? 's' : ''}`,
            included: true,
        },
        {
            icon: UserCheck,
            text: f.max_leads === -1 ? 'Unlimited leads' : `${fmt(f.max_leads)} leads`,
            included: true,
        },
        {
            icon: Clock,
            text:
                (f.ai_minutes_included ?? f.monthly_minutes_included) === -1
                    ? 'Unlimited AI min included'
                    : `${fmt(f.ai_minutes_included ?? f.monthly_minutes_included)} AI min included`,
            included: true,
        },
        {
            icon: PlusCircle,
            text: f.topup_allowed
                ? `Top-up @ ₹${f.topup_rate_per_minute ?? 6}/min`
                : 'No top-up',
            included: !!f.topup_allowed,
        },
        {
            icon: FileDown,
            text: 'CSV export',
            included: !!f.csv_export,
        },
        {
            icon: Globe,
            text: 'Custom domain',
            included: !!f.custom_domain,
        },
        {
            icon: Plug,
            text:
                f.lead_source_integrations === -1
                    ? 'All integrations'
                    : f.lead_source_integrations === 0
                    ? 'No integrations'
                    : `${f.lead_source_integrations} integration${f.lead_source_integrations !== 1 ? 's' : ''}`,
            included: (f.lead_source_integrations ?? 0) !== 0,
        },
        {
            icon: GitBranch,
            text: 'Pipeline automation',
            included: true,
        },
        {
            icon: ScrollText,
            text:
                f.audit_log_days === -1
                    ? 'Full audit history'
                    : f.audit_log_days === 0
                    ? 'No audit logs'
                    : `Audit logs — ${f.audit_log_days} days`,
            included: (f.audit_log_days ?? 0) !== 0,
        },
    ];
}

const PLAN_ICONS = {
    free: Sparkles,
    starter: Zap,
    pro: Rocket,
    enterprise: Building2,
};

// ─── sub-components ──────────────────────────────────────────────────────────

function PriceDisplay({ plan }) {
    if (plan.slug === 'enterprise') {
        return (
            <div className="mt-4 mb-2">
                <p className="text-3xl font-bold text-gray-900">Custom</p>
                <p className="text-sm text-gray-500 mt-1">Tailored to your scale</p>
            </div>
        );
    }

    if (!plan.price_monthly || plan.price_monthly === 0) {
        return (
            <div className="mt-4 mb-2">
                <p className="text-3xl font-bold text-gray-900">Free</p>
                <p className="text-sm text-gray-500 mt-1">Valid for 6 months</p>
            </div>
        );
    }

    const yearly = plan.price_yearly ?? Math.round(plan.price_monthly * 12 * 0.8);

    return (
        <div className="mt-4 mb-2">
            <p className="text-3xl font-bold text-gray-900">
                ₹{plan.price_monthly.toLocaleString('en-IN')}
                <span className="text-base font-normal text-gray-500">/mo</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
                ₹{yearly.toLocaleString('en-IN')}/yr{' '}
                <span className="text-green-600 font-medium">(save 20%)</span>
            </p>
        </div>
    );
}

function FeatureRow({ icon: Icon, text, included }) {
    return (
        <div className="flex items-start gap-2.5">
            {included ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
                <X className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
            )}
            <span className={`text-sm leading-snug ${included ? 'text-gray-700' : 'text-gray-400'}`}>
                {text}
            </span>
        </div>
    );
}

function PlanCTA({ plan, isCurrentPlan, currentSortOrder }) {
    if (isCurrentPlan) {
        return (
            <Button className="w-full" variant="secondary" disabled>
                Current Plan
            </Button>
        );
    }

    const isDowngrade = currentSortOrder > 0 && plan.sort_order < currentSortOrder;
    const actionLabel = isDowngrade ? 'Downgrade' : 'Upgrade';

    if (plan.slug === 'enterprise') {
        return (
            <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                    window.location.href =
                        'mailto:sales@quinite.in?subject=Enterprise%20Plan%20Inquiry';
                }}
            >
                Contact Sales
            </Button>
        );
    }

    return (
        <Button
            className={cn(
                'w-full transition-all',
                !isDowngrade && 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
            variant={isDowngrade ? 'outline' : 'default'}
            onClick={() => {
                window.location.href =
                    `mailto:support@quinite.in?subject=${actionLabel}%20to%20${encodeURIComponent(plan.name)}%20Plan`;
            }}
        >
            Contact us to {actionLabel.toLowerCase()}
        </Button>
    );
}

// ─── main component ──────────────────────────────────────────────────────────

import { Skeleton } from '@/components/ui/skeleton';

export default function PricingTiers({ currentPlanSlug }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const res = await fetch('/api/platform/plans');
                const data = await res.json();
                if (res.ok && Array.isArray(data.plans)) {
                    setPlans(data.plans);
                } else if (res.ok && Array.isArray(data)) {
                    setPlans(data);
                } else {
                    setError('Failed to load plans.');
                }
            } catch (err) {
                console.error('Error fetching plans:', err);
                setError('Failed to load plans.');
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="p-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <Skeleton className="h-6 w-32" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-8 w-24" />
                        </div>
                        <div className="space-y-3 pt-4 border-t">
                            {[1, 2, 3, 4, 5].map(j => (
                                <div key={j} className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            ))}
                        </div>
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-16 text-sm text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                {(() => {
                    const currentPlanObj = plans.find(p => p.slug?.toLowerCase() === currentPlanSlug?.toLowerCase());
                    const currentSortOrder = currentPlanObj?.sort_order || 0;

                    return plans.map((plan) => {
                        const isHighlighted = plan.slug === 'pro';
                        const isCurrentPlan =
                            currentPlanSlug?.toLowerCase() === plan.slug?.toLowerCase();
                        const Icon = PLAN_ICONS[plan.slug] ?? Rocket;
                        const features = buildFeatureList(plan.features ?? {});

                        return (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col rounded-2xl shadow-sm transition-shadow hover:shadow-md ${
                                isHighlighted
                                    ? 'border-2 border-blue-500 shadow-blue-100 shadow-lg'
                                    : 'border border-gray-200'
                            }`}
                        >
                            {/* Most Popular badge */}
                            {isHighlighted && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                                        <Sparkles className="w-3 h-3" />
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <CardHeader className="pb-0 pt-6 px-5">
                                {/* Icon + name */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-xl ${
                                            isHighlighted
                                                ? 'bg-blue-100 text-blue-600'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-semibold text-gray-900">
                                        {plan.name}
                                    </CardTitle>
                                </div>

                                {/* Description */}
                                <CardDescription className="mt-2 text-sm text-gray-500 leading-relaxed">
                                    {plan.description ?? 'Flexible plan for your needs'}
                                </CardDescription>

                                {/* Price */}
                                <PriceDisplay plan={plan} />

                                {/* Current plan badge */}
                                {isCurrentPlan && (
                                    <Badge className="w-fit bg-green-100 text-green-700 border-0 text-xs font-medium mb-1">
                                        Your current plan
                                    </Badge>
                                )}
                            </CardHeader>

                            <CardContent className="flex flex-col flex-1 px-5 pb-6 pt-4 gap-5">
                                {/* Divider */}
                                <div className="border-t border-gray-100" />

                                {/* Features */}
                                <div className="space-y-2.5 flex-1">
                                    {features.map((feat, idx) => (
                                        <FeatureRow key={idx} {...feat} />
                                    ))}
                                </div>

                                {/* CTA */}
                                <PlanCTA plan={plan} isCurrentPlan={isCurrentPlan} currentSortOrder={currentSortOrder} />
                            </CardContent>
                        </Card>
                    );
                    });
                })()}
            </div>
        </div>
    );
}
