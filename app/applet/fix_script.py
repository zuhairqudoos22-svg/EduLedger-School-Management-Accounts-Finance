# 1. Update src/services/firebase.ts
with open('src/services/firebase.ts', 'r') as f:
    fb = f.read()

if 'export { isFirebaseConfigured }' not in fb:
    fb += '\nexport { isFirebaseConfigured } from "../firebase-config";\n'
    with open('src/services/firebase.ts', 'w') as f:
        f.write(fb)
    print('Exported isFirebaseConfigured in src/services/firebase.ts')

# 2. Update src/services/cloudSyncService.ts
with open('src/services/cloudSyncService.ts', 'r') as f:
    css = f.read()

css = css.replace(
    'details: `Collected ${payment.paidAmount} PKR',
    'details: `Collected ${payment.totalAmount} PKR'
)

with open('src/services/cloudSyncService.ts', 'w') as f:
    f.write(css)
print('Updated payment.totalAmount in cloudSyncService.ts')

# 3. Update src/components/settings/SettingsView.tsx
with open('src/components/settings/SettingsView.tsx', 'r') as f:
    sv = f.read()

target_btn = """        <button
          onClick={() => setActiveTab('sync')}
          className={}
        >"""

replacement_btn = """        <button
          onClick={() => setActiveTab('sync')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'sync'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >"""

if target_btn in sv:
    sv = sv.replace(target_btn, replacement_btn)
    with open('src/components/settings/SettingsView.tsx', 'w') as f:
        f.write(sv)
    print('Fixed className in SettingsView.tsx')
else:
    print('target_btn not matched in SettingsView.tsx')

# 4. Update src/context/SchoolContext.tsx
with open('src/context/SchoolContext.tsx', 'r') as f:
    sc = f.read()

# Add imports if missing
if 'saveEntityToCloud' not in sc:
    import_line = """import {
  saveEntityToCloud,
  deleteEntityFromCloud,
  subscribeToSchoolCloudCollections,
  recordFeePaymentAtomic,
  recordBulkPayrollAtomic,
} from '../services/cloudSyncService';
import { isFirebaseConfigured } from '../firebase-config';
"""
    sc = import_line + sc
    print('Added cloudSyncService imports to SchoolContext.tsx')

# Fix catch parameter typing
sc = sc.replace('.catch((e) => {', '.catch((e: unknown) => {')

# Fix resetEntireSchoolDatabaseDB call
sc = sc.replace(
    'await resetEntireSchoolDatabaseDB(newSettings, usersToKeep);',
    """await resetEntireSchoolDatabaseDB({
        keepCurrentUser: options?.keepAdminAccount,
        newSchoolName: options?.newSchoolName?.trim(),
        newSchoolTagline: options?.newSchoolTagline?.trim(),
        newCurrency: options?.newCurrency?.trim(),
      });"""
)

with open('src/context/SchoolContext.tsx', 'w') as f:
    f.write(sc)
print('Updated SchoolContext.tsx successfully')
