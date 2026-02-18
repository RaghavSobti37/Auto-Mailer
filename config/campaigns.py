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


class MasterclassParams:
    """Configuration for Masterclass campaign."""
    CSV_PATH = 'data/csv/master_db_cleaned.csv'
    INCLUDE_BANNER = False
    BANNER_PATH = 'assets/banner.jpg'


class HavellsMyousicParams:
    """Configuration for Havells mYOUsic campaign."""
    CSV_PATH = 'csv/master_db_cleaned.csv'
    SUBJECT = "Amplify Your Music on Havells mYOUsic 🎵"
    FORM_LINK = 'https://forms.gle/eFyhEW3ifTdtByvm7'
    TEMPLATE_FUNC = 'get_havells_myousic_template'
    INCLUDE_BANNER = True
    BANNER_PATH = 'assets/Havells_banner.jpg'
