# Salary Reminder Notifications Guide

## 🔔 Overview

FinTrack now supports **browser notifications** to remind you to enter your salary at the beginning of each month. This works even when the app is closed (if installed as a PWA).

---

## ✨ Features

### 1. **Permission Request**
- On first visit, you'll see a prompt asking to enable notifications
- Click "Enable Notifications" to allow salary reminders
- You can dismiss the prompt if you don't want notifications

### 2. **Automatic Monthly Reminders**
- **When**: 1st, 2nd, or 3rd of each month
- **Condition**: Only if you haven't entered a salary for that month yet
- **Notification**: "💼 Salary Reminder - Don't forget to enter your [Month] salary to track your monthly budget!"

### 3. **Smart Detection**
- Automatically checks if you've already entered your salary
- Only sends notification if salary is missing
- Works in the background (checks daily)

---

## 📱 How It Works

### Browser Notifications
- Uses the **Browser Notification API**
- Works on Chrome, Edge, Firefox, Safari (with permission)
- Shows notification even when app is closed (if PWA installed)
- Click notification to open the app

### Scheduling
- Checks daily for salary reminders
- Sends notification on 1st-3rd of month if salary missing
- Automatically stops if salary is entered

---

## 🎯 User Experience

### First Time Setup

1. **Visit Dashboard**
   - You'll see a card in the bottom-left corner: "Enable Salary Reminders"

2. **Click "Enable Notifications"**
   - Browser will ask for notification permission
   - Click "Allow" in the browser prompt

3. **Done!**
   - You'll receive notifications automatically
   - No further action needed

### Monthly Reminder Flow

1. **1st-3rd of Month**
   - System checks if you've entered salary
   - If missing → sends browser notification
   - Notification appears even if app is closed

2. **Click Notification**
   - Opens the app
   - You can add your salary entry

3. **After Entering Salary**
   - Reminder stops automatically
   - Won't send more notifications for that month

---

## 🔧 Technical Details

### Files Created

1. **`frontend/lib/notification-service.ts`**
   - Core notification logic
   - Permission handling
   - Scheduling functions

2. **`frontend/components/SalaryReminderNotification.tsx`**
   - UI component for permission prompt
   - Integrates with notification service
   - Shows/hides based on permission status

### Integration

- Added to dashboard page
- Automatically loads when dashboard opens
- Works with existing salary reminder toast (both show)

---

## 🛠️ Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Best support |
| Edge | ✅ Full | Same as Chrome |
| Firefox | ✅ Full | Works well |
| Safari | ✅ Full | Requires user permission |
| Mobile Chrome | ✅ Full | Works on Android |
| Mobile Safari | ⚠️ Limited | iOS has restrictions |

---

## 📋 Notification Settings

### User Controls

- **Enable**: Click "Enable Notifications" button
- **Disable**: 
  - Browser settings → Site permissions → Notifications → Block
  - Or dismiss the prompt (won't ask again)

### What Gets Notified

- **Salary reminders only** (currently)
- Future: Budget alerts, recurring transactions, etc.

---

## 🎨 Customization

### Change Reminder Days

Edit `notification-service.ts`:
```typescript
// Currently: 1st-3rd of month
if (currentDay < 1 || currentDay > 3) {
  return { shouldNotify: false, monthName: "" }
}

// Change to: 1st-5th
if (currentDay < 1 || currentDay > 5) {
  return { shouldNotify: false, monthName: "" }
}
```

### Change Notification Message

Edit `notification-service.ts`:
```typescript
export function sendSalaryReminder(monthName: string): void {
  sendNotification({
    title: "💼 Salary Reminder", // Change title
    body: `Your custom message for ${monthName}`, // Change body
    // ...
  })
}
```

---

## 🐛 Troubleshooting

### Notifications Not Showing?

1. **Check Permission**
   - Browser settings → Site permissions → Notifications
   - Make sure FinTrack is "Allowed"

2. **Check Browser Support**
   - Open browser console
   - Type: `"Notification" in window`
   - Should return `true`

3. **Check Date**
   - Notifications only send on 1st-3rd of month
   - Test by temporarily changing the date check

4. **Check Salary Entry**
   - If you already entered salary, notification won't send
   - This is by design

### Permission Denied?

1. **Reset in Browser**
   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Find your site and reset permission

2. **Clear localStorage**
   - Open console
   - Run: `localStorage.removeItem("notificationPromptDismissed")`
   - Refresh page

---

## 🚀 Future Enhancements

Potential additions:
- Budget threshold alerts
- Recurring transaction reminders
- Weekly spending summaries
- Goal progress notifications
- Custom notification preferences

---

## 📝 Summary

✅ **Browser notifications enabled**
✅ **Automatic monthly salary reminders**
✅ **Smart detection (only if salary missing)**
✅ **Works in background**
✅ **User-friendly permission prompt**

**Enjoy never missing a salary entry again!** 💰

