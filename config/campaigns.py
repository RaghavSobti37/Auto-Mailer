"""Campaign configuration parameters."""


class TeaserParams:
    """Configuration for Teaser email campaign."""
    CSV_PATH = 'data/csv/master_db.csv'
    SUBJECT = "We have something for artists!"
    FORM_LINK = 'https://forms.gle/eFyhEW3ifTdtByvm7'
    TEMPLATE_FUNC = 'get_teaser_template'
    INCLUDE_BANNER = False


class MainParams:
    """Configuration for Main campaign."""
    CSV_PATH = 'data/csv/master_db.csv'
    SUBJECT = "Turn Up the Volume on Your Dreams – mYOUsic is Here!"
    FORM_LINK = 'https://forms.gle/teaser_form_link'
    TEMPLATE_MODULE = 'src.templates'
    TEMPLATE_FUNC = 'get_html_template'
    INCLUDE_BANNER = True
    BANNER_PATH = 'assets/banner.jpg'


class IMLPromoParams:
    """Configuration for IML Promo campaign."""
    CSV_PATH = 'data/csv/master_db.csv'
    SUBJECT = "🚀 The InstaMusic League is LIVE — ₹10 LAKH to Win!"
    FORM_LINK = 'https://iml.tscacademy.in/'
    TEMPLATE_MODULE = 'src.templates'
    TEMPLATE_FUNC = 'get_html_template'
    INCLUDE_BANNER = True
    BANNER_PATH = 'assets/iml banner v1.png'


class IMLReminderParams:
    """Configuration for IML Reminder campaign."""
    CSV_PATH = 'data/csv/pending_email_db.csv'
    INCLUDE_BANNER = False


class IMLFinalCallParams:
    """Configuration for IML Final Call campaign."""
    CSV_PATH = 'data/csv/test_leads.csv'
    INCLUDE_BANNER = True
    BANNER_PATH = 'assets/banner 1.jpg'


class MasterclassParams:
    """Configuration for Masterclass campaign."""
    CSV_PATH = 'data/csv/master_db_cleaned.csv'
    INCLUDE_BANNER = False
    BANNER_PATH = 'assets/banner.jpg'
