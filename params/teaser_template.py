def get_teaser_template(name, FORM_LINK):
    return f"""
    <html>
        <body style='font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 0; margin: 0;'>
            <div style='max-width:600px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);'>
                <div style='padding:32px;'>
                    <p>Hi <b>{name}</b>,</p>
                    <p>Something exciting is coming for original music creators! Singer? Composer? Music Producer? Original Band? </p>
                    <p>Ready to unfold your musical journey? Find out more below!</p>
                    <div style='text-align:center; margin:40px 0;'>
                        <a href='{FORM_LINK}' style='background:#ff0000; color:#fff; padding:20px 40px; border-radius:8px; text-decoration:none; font-size:1.2em; font-weight:bold; display:inline-block;'>Start your Journey Here</a>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """