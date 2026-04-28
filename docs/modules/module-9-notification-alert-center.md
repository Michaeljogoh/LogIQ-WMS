# Module 9 - Notification & Alert Center

## Scope Implemented

This module adds in-app notifications, channel-based delivery preferences, escalation rules for unacknowledged critical alerts, and notification UI surfaces across the operator dashboard.

## Files Added / Updated

- `prisma/schema.prisma`
  - Added models:
    - `Notification`
    - `NotificationPreference`
    - `EscalationRule`
    - `PushSubscription`
  - Added enums:
    - `NotificationType`
    - `NotificationSeverity`
    - `NotificationChannel`
  - Added account-level relations:
    - `LogiqAccount.notifications`
    - `LogiqAccount.notificationPreferences`
    - `LogiqAccount.escalationRules`
    - `LogiqAccount.pushSubscriptions`

- `src/server/api/routers/notification.ts`
  - Implemented notification procedures:
    - `notifications.list`
    - `notifications.markRead`
    - `notifications.getPreferences`
    - `notifications.updatePreference`
    - `notifications.subscribe`
  - Implemented escalation procedures:
    - `escalation.getRules`
    - `escalation.upsertRule`

- `src/app/trpc/routers/_app.ts`
  - Registered:
    - `notifications`
    - `escalation`
  - Added compatibility alias:
    - `notification`

- `src/server/jobs/queues.ts`
  - Added:
    - `NotifyJobPayload` union
    - `notifyQueue.add()` dispatch API

- `src/server/jobs/workers/notify.worker.ts`
  - Implemented worker handlers:
    - `notify.dispatch`
    - `notify.sendEmail`
    - `notify.sendSms`
    - `notify.sendPush`
    - `notify.escalate`

- `src/server/notifications/dispatch.ts`
  - Added reusable dispatch helper:
    - `dispatchDomainNotification()`

- `src/components/shared/notification-bell.tsx`
  - Added live unread badge and drawer trigger integration

- `src/components/shared/notification-drawer.tsx`
  - Implemented notification drawer UI with:
    - severity grouping
    - unread indicator
    - mark all read action
    - deep-link handling via notification `data.actionUrl`

- `src/app/(dashboard)/layout.tsx`
  - Integrated `NotificationBell` into top header

- `src/app/(dashboard)/settings/notifications/page.tsx`
  - Replaced placeholder with full settings UI:
    - preference matrix (type × channels)
    - escalation rules management
    - Slack connection section

- `src/components/shared/slack-connect-button.tsx`
  - Added `SlackConnectButton` UI component

- `src/app/api/integrations/slack/oauth/route.ts`
  - Added Slack OAuth entry endpoint

## tRPC Procedures Implemented

- `notifications.list`
  - Returns paginated notifications for current user context (`userId` and broadcast entries), plus unread count

- `notifications.markRead`
  - Marks single notification or all notifications as read for current user

- `notifications.getPreferences`
  - Returns all per-type channel preferences
  - Auto-seeds missing preference rows for all `NotificationType` values

- `notifications.updatePreference`
  - Updates channel toggles (`inApp`, `email`, `slack`, `sms`, `push`) for a single notification type

- `notifications.subscribe`
  - Stores browser push subscription endpoint/payload for current user device

- `escalation.getRules`
  - Returns account escalation rules by severity

- `escalation.upsertRule`
  - Creates/updates escalation rule per severity

## Job Flow Implemented

- `notify.dispatch`
  - Resolves target users
  - Loads or creates user notification preferences
  - Creates in-app notifications
  - Creates channel notification records and invokes:
    - `notify.sendEmail`
    - `notify.sendSms`
    - `notify.sendPush`

- `notify.sendEmail`
  - Sends email using existing email utility
  - Updates `sentAt`/`failedAt`

- `notify.sendSms`
  - Simulates Twilio send path and stores generated SMS SID in `Notification.data`
  - Updates `sentAt`/`failedAt`

- `notify.sendPush`
  - Uses stored push subscriptions and marks notification send status

- `notify.escalate`
  - Scans unacknowledged critical notifications older than `ackWindowMinutes`
  - Creates escalation notifications for configured users
  - Sends SMS if `escalateViaSms=true`

## UI Components & Route Coverage

- `NotificationBell`
  - Header bell icon
  - Unread badge with count capping (`99+`)
  - Opens `NotificationDrawer`

- `NotificationDrawer`
  - Slide-in panel grouped by `CRITICAL`, `WARNING`, `INFO`
  - Mark all read action
  - Click-through deep link behavior from payload data

- `/settings/notifications`
  - Preference grid with channel toggles per `NotificationType`
  - Escalation rule controls:
    - acknowledgement window
    - escalation recipients
    - SMS escalation toggle
  - Slack connect section via `SlackConnectButton`

- `SlackConnectButton`
  - Launches Slack OAuth flow in new tab/window

## Dispatch Pattern Support

The module now supports service-layer dispatch in the pattern:

- call `dispatchDomainNotification(...)` from domain services
- helper forwards to `notifyQueue.add("notify.dispatch", ...)`
- worker fans out per configured channels and escalation policy

## Validation Completed

- TypeScript build (`pnpm build`) successful after Module 9 implementation.
- No linter diagnostics in touched Module 9 files via `ReadLints`.

