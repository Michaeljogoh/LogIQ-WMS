"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Billing email" />
          <Input placeholder="Operations email" />
          <Input placeholder="Support phone" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center justify-between">
            Order updates
            <Switch defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            Shipment exceptions
            <Switch defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            Invoice reminders
            <Switch defaultChecked />
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
