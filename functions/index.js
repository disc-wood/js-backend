const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.sendInvite = onCall(async (request) => {
  // only admins can send invites
  if (request.auth?.token?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can send invites');
  }

  const { email, programId } = request.data;

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      email,
      program_id: programId,
      invited_by: request.auth.uid,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw new HttpsError('internal', error.message);

  const inviteLink = `https://yourapp.com/invite?token=${data.token}`;
  console.log('Invite link:', inviteLink);

  return { success: true, inviteLink };
});