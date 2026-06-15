"use client";

import { Bell, Mail, Phone } from "lucide-react";
import {
  SettingsListItem,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
} from "@/components/settings/settings-page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NOTIFICATIONS = [
  { id: "orders", label: "Order updates", defaultOn: true },
  { id: "shipments", label: "Shipment exceptions", defaultOn: true },
  { id: "invoices", label: "Invoice reminders", defaultOn: true },
] as const;

export default function Page() {
  return (
    <SettingsPage>
      <PageHeader
        description="Contact details and notification preferences for your merchant account."
        title="General settings"
      />

      <SettingsPanel>
        <SettingsPanelHeader
          description="Where your 3PL sends billing, operations, and support communication."
          icon={Mail}
          title="Contacts"
        />
        <SettingsPanelBody className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="billing-email">Billing email</Label>
            <Input id="billing-email" placeholder="billing@brand.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ops-email">Operations email</Label>
            <Input id="ops-email" placeholder="ops@brand.com" type="email" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="support-phone">Support phone</Label>
            <Input id="support-phone" placeholder="+1 (555) 000-0000" type="tel" />
          </div>
        </SettingsPanelBody>
      </SettingsPanel>

      <SettingsPanel>
        <SettingsPanelHeader
          description="Choose which events trigger email notifications."
          icon={Bell}
          title="Notification preferences"
        />
        <SettingsPanelBody className="space-y-1">
          {NOTIFICATIONS.map((item) => (
            <SettingsListItem
              actions={
                <Switch defaultChecked={item.defaultOn} id={item.id} />
              }
              key={item.id}
            >
              <Label className="font-medium" htmlFor={item.id}>
                {item.label}
              </Label>
            </SettingsListItem>
          ))}
          <SettingsListItem
            actions={<Switch defaultChecked id="sms-alerts" />}
          >
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" aria-hidden />
              <Label className="font-medium" htmlFor="sms-alerts">
                SMS for critical exceptions
              </Label>
            </div>
          </SettingsListItem>
        </SettingsPanelBody>
      </SettingsPanel>
    </SettingsPage>
  );
}
