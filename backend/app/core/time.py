from datetime import datetime, timezone, timedelta


JAKARTA_TZ = timezone(timedelta(hours=7))


def now_jakarta() -> datetime:
    return datetime.now(tz=JAKARTA_TZ)
