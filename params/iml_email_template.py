def get_iml_html_template(name):
    return f"""
    <html>
        <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
            <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
                <img src='cid:bannerimage' alt='InstaMusic League Banner' style='width:100%; display:block;'>
                <div style='padding:32px;'>
                    <h2 style='color:#ff0000; text-align:center;'>🚀 The InstaMusic League is LIVE — ₹10 LAKH to Win!</h2>
                    <p>Hey {name},</p>
                    <p>The wait is over — InstaMusic League by TSC Academy is here!<br>
                    A digital platform where your original sound takes the spotlight.</p>
                    <p>🔥 Here’s how you can enter:</p>
                    <ol style='padding-left:20px;'>
                        <li>Post your original music reel (any genre) on Instagram.</li>
                        <li>Tag @the_shakti_collective and @tscacademy.</li>
                        <li>Register through the link below before 7th Dec 2025.</li>
                    </ol>
                    <p>💰 Prizes & Opportunities:</p>
                    <ul style='padding-left:20px;'>
                        <li>₹10 LAKH total prize pool</li>
                        <li>100+ TSC Academy scholarships</li>
                        <li>Mentorship from top artists and producers</li>
                        <li>A chance to release your own song</li>
                    </ul>
                    <p>🎶 Likes don’t define you — your sound does.<br>
                    So hit record, upload your reel, and let your music speak.</p>
                    <p>🎯 Your stage is waiting.</p>
                    <div style='text-align:center; margin:40px 0;'>
                        <a href='YOUR_REGISTRATION_LINK_HERE' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.3em; font-weight:bold; display:inline-block;'>👉 Enter Now</a>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """