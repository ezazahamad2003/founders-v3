# Scopic Legal - Deployment Guide
## Private Beta Program Implementation

---

## 🎯 Pre-Deployment Checklist

- [x] ✅ Database migration completed
- [x] ✅ Email templates updated in Supabase
- [x] ✅ Code committed and pushed to GitHub
- [ ] Backend deployment
- [ ] Frontend deployment

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend

#### If using Vercel/Railway/Render:
```bash
# The platform should auto-deploy from GitHub push
# Verify deployment logs for any errors
```

#### If using manual deployment:
```bash
cd backend
pip install -r requirements.txt
# Set environment variables
# Restart the server
```

**Environment Variables to Verify:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_JWKS_URL`
- `SUPABASE_DB_URL`
- `OPENAI_API_KEY`
- `FRONTEND_URL` (should be production URL, not localhost)

---

### Step 2: Deploy Frontend

#### If using Vercel:
```bash
# Vercel should auto-deploy from GitHub push
# Check deployment logs at https://vercel.com/dashboard
```

#### Manual deployment:
```bash
cd frontend
npm install
npm run build
# Deploy the .next folder to your hosting
```

**Environment Variables to Verify:**
- `NEXT_PUBLIC_API_BASE_URL` (backend production URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Step 3: Verify Deployment

1. **Backend Health Check:**
   ```bash
   curl https://your-backend-url.com/health
   # Should return 200 OK
   ```

2. **Frontend Load:**
   - Visit your production URL
   - Check browser console for errors
   - Verify all assets load (CSS, JS, images)

3. **Legal Documents:**
   - Visit `/terms`, `/privacy`, `/acceptance`
   - Verify DOCX files are accessible
   - Test download buttons

---

## 🧪 Quick Smoke Test

After deployment, run these quick tests:

### 1. Sign-Up Flow (5 min)
```
✓ Navigate to app
✓ Click "Want to join our private beta? Apply here"
✓ Fill in: Full Name, Company, Referral Source, Email, Password
✓ Click "Apply to Join"
✓ Check email for confirmation
✓ Click confirmation link
✓ Accept terms in modal
✓ Verify chat interface loads
```

### 2. File Upload (3 min)
```
✓ Click "+" button (before any messages)
✓ Upload a PDF file
✓ Verify loading spinner appears
✓ Verify file attaches
✓ Send a message asking about the file
✓ Verify AI responds with file content
```

### 3. Profile Library (2 min)
```
✓ Click "+ Upload Legal Docs"
✓ Drag and drop a file
✓ Verify file uploads
✓ Click "View" - file opens
✓ Click "Delete" - file is removed
✓ Click "Book Check-In Meeting" - opens Runway6 link
```

### 4. Legal Pages (2 min)
```
✓ Visit /terms - page loads, download works
✓ Visit /privacy - page loads, download works
✓ Visit /acceptance - page loads, download works
```

**Total Time:** ~12 minutes

---

## 🔍 Post-Deployment Monitoring

### Check These Logs:

1. **Backend Logs:**
   - Look for any 500 errors
   - Check file upload errors
   - Verify JWT validation working

2. **Frontend Logs:**
   - Check browser console for errors
   - Verify API calls succeeding
   - Check for CORS issues

3. **Supabase Logs:**
   - Monitor auth events
   - Check storage uploads
   - Verify database queries

### Key Metrics to Watch:

- **Sign-up success rate** (should be ~100%)
- **Email confirmation rate** (depends on user behavior)
- **File upload success rate** (should be >95%)
- **API response times** (should be <2s)

---

## 🐛 Common Issues & Fixes

### Issue 1: Email Confirmation Points to Localhost
**Symptom:** Confirmation email links to `http://localhost:3000`

**Fix:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set "Site URL" to your production URL
3. Add production URL to "Redirect URLs"

---

### Issue 2: File Upload Fails
**Symptom:** Files don't upload, error in console

**Possible Causes:**
- CORS not configured in Supabase Storage
- Storage bucket doesn't exist
- Anon key doesn't have upload permissions

**Fix:**
1. Go to Supabase Dashboard → Storage → Policies
2. Ensure "uploads" bucket has INSERT policy for authenticated users
3. Check CORS configuration allows your frontend domain

---

### Issue 3: Legal Documents 404
**Symptom:** `/terms`, `/privacy`, `/acceptance` return 404

**Fix:**
- Verify `frontend/public/legal/` folder was deployed
- Check if static files are being served correctly
- Ensure Next.js build includes public folder

---

### Issue 4: User Metadata Not Saved
**Symptom:** `company_name` and `referral_source` are NULL in database

**Possible Causes:**
- Database migration not run
- JWT doesn't include `user_metadata`
- Backend not extracting metadata

**Fix:**
1. Verify migration ran: `SELECT company_name FROM profiles LIMIT 1;`
2. Check JWT payload includes `user_metadata` field
3. Verify backend `auth.py` extracts metadata correctly

---

### Issue 5: Terms Modal Links Don't Work
**Symptom:** Clicking "Terms of Use" or "Privacy Policy" doesn't open page

**Fix:**
- Check browser console for errors
- Verify routes exist in Next.js
- Check if popup blocker is preventing new tabs

---

## 📊 Success Criteria

Deployment is successful when:

- ✅ New users can sign up with all 5 fields
- ✅ Email confirmation works (not localhost)
- ✅ Terms modal shows and links work
- ✅ File upload works before first message
- ✅ Profile Library drag-and-drop works
- ✅ All legal pages load and downloads work
- ✅ Calendar link opens Runway6 scheduler
- ✅ No console errors on fresh page load
- ✅ User metadata saves to database

---

## 🎉 Post-Deployment

Once all tests pass:

1. **Notify Stakeholders:**
   ```
   Subject: Scopic Legal Private Beta - Deployment Complete
   
   The Private Beta Program updates are now live:
   - New sign-up form with Full Name, Company, Referral Source
   - Updated branding throughout the app
   - File upload now works before first message
   - Legal documents accessible at /terms, /privacy, /acceptance
   - Profile Library with drag-and-drop and delete
   - Calendar integration for check-in meetings
   
   Please test the sign-up flow and provide feedback.
   
   Meeting Scheduler: https://runway6.vc/meetings/abhanot/dpcheckin?uuid=d4556964-cc24-4a30-8c61-b0d456a87f30
   ```

2. **Monitor for 24 Hours:**
   - Check error logs every 4 hours
   - Watch for any user-reported issues
   - Monitor sign-up conversion rate

3. **Collect Feedback:**
   - Ask beta users to test the new features
   - Note any UX issues
   - Track feature adoption

4. **Schedule Review:**
   - Book a meeting to review deployment
   - Discuss any issues found
   - Plan next iteration

---

## 📞 Support

If you encounter issues during deployment:

1. Check `IMPLEMENTATION_SUMMARY.md` for technical details
2. Review `TESTING_CHECKLIST.md` for specific test cases
3. Check backend/frontend logs for errors
4. Verify all environment variables are set correctly

---

## 🔗 Quick Links

- **GitHub Repo:** https://github.com/ezazahamad2003/founders-v3
- **Commit:** `fce1e9e` - feat: implement private beta program feedback
- **Files Changed:** 43 files, +1216 insertions, -314 deletions
- **Meeting Scheduler:** https://runway6.vc/meetings/abhanot/dpcheckin?uuid=d4556964-cc24-4a30-8c61-b0d456a87f30

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Environment:** Production  
**Status:** [ ] Success / [ ] Issues Found

