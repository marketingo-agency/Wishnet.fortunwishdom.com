"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { UsersManagement } from '@/components/settings/UsersManagement';
import { LLMProvidersSettings } from '@/components/settings/LLMProvidersSettings';
import { MasterMindSettings } from '@/components/settings/MasterMindSettings';
import { FilesManagerSettings } from '@/components/settings/FilesManagerSettings';
import { SystemPromptsPanel } from '@/components/settings/SystemPromptsPanel';
import { PulseSettings } from '@/components/settings/PulseSettings';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, Palette, Users, Sparkles, BrainCircuit, FolderOpen, MessageSquare, Radio } from 'lucide-react';

export default function Settings() {
  const router = useRouter();
  const pathname = usePathname() ?? '/settings';
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const activeTab = searchParams?.get('tab') || 'account';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex h-full p-0">
      <div className="flex flex-col w-full bg-card rounded-xl sm:rounded-2xl shadow-sm border border-border overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b px-4 sm:px-6 py-4 shrink-0">
            <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>

            {/* UI-08: mobile-only right-edge fade hints the tab strip scrolls horizontally */}
            <div className="overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0 mt-4 [mask-image:linear-gradient(to_right,#000_92%,transparent)] sm:[mask-image:none]">
              <TabsList className="bg-muted/50 inline-flex min-w-max">
                <TabsTrigger value="account" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                  <SettingsIcon className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  <span className="sm:hidden">Acct</span>
                  <span className="hidden sm:inline">Account</span>
                </TabsTrigger>
                {isAdmin && (
                  <>
                    <TabsTrigger value="branding" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <Palette className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                      <span className="sm:hidden">Brand</span>
                      <span className="hidden sm:inline">Branding</span>
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <Users className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                      <span>Users</span>
                    </TabsTrigger>
                    <TabsTrigger value="llm" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <Sparkles className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
                      <span>LLM</span>
                    </TabsTrigger>
                    <TabsTrigger value="mastermind" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <BrainCircuit className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500" />
                      <span className="sm:hidden">Mind</span>
                      <span className="hidden sm:inline">MasterMind</span>
                    </TabsTrigger>
                    <TabsTrigger value="files" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <FolderOpen className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-500" />
                      <span>Files</span>
                    </TabsTrigger>
                    <TabsTrigger value="prompts" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <MessageSquare className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                      <span>Prompts</span>
                    </TabsTrigger>
                    <TabsTrigger value="pulse" className="data-[state=active]:bg-background text-xs sm:text-sm shrink-0">
                      <Radio className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
                      <span>Pulse</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-6">
              <TabsContent value="account" className="mt-0">
                <AccountSettings />
              </TabsContent>
              
              {isAdmin && (
                <>
                  <TabsContent value="branding" className="mt-0">
                    <BrandingSettings />
                  </TabsContent>
                  <TabsContent value="users" className="mt-0">
                    <UsersManagement />
                  </TabsContent>
                  <TabsContent value="llm" className="mt-0">
                    <LLMProvidersSettings />
                  </TabsContent>
                  <TabsContent value="mastermind" className="mt-0">
                    <MasterMindSettings />
                  </TabsContent>
                  <TabsContent value="files" className="mt-0">
                    <FilesManagerSettings />
                  </TabsContent>
                  <TabsContent value="prompts" className="mt-0">
                    <SystemPromptsPanel />
                  </TabsContent>
                  <TabsContent value="pulse" className="mt-0">
                    <PulseSettings />
                  </TabsContent>
                </>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
