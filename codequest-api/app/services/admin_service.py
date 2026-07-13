"""Admin service"""
from datetime import datetime, timezone, date
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.lesson import Lesson
from app.models.achievement import Achievement
from app.models.admin import SystemSettings, ContentAuditLog
from app.models.submission import Submission
from app.models.progress import Progress

class AdminService:
    def __init__(self, db):
        self.db = db
    async def get_dashboard_stats(self):
        r = await self.db.execute(select(func.count(User.id)))
        return {"total_users": r.scalar() or 0, "total_lessons": 0, "total_achievements": 0, "total_submissions": 0, "today_new_users": 0, "today_active_users": 0, "today_submissions": 0, "today_pass_rate": 0.0, "total_lessons_completed": 0}
    async def get_dashboard_chart(self, days: int = 7):
        from datetime import timedelta
        today = date.today()
        data = []
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, datetime.min.time())
            day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())
            r = await self.db.execute(
                select(func.count(User.id)).where(
                    User.created_at >= day_start, User.created_at < day_end
                )
            )
            new_users = r.scalar() or 0
            r = await self.db.execute(
                select(func.count(Submission.id)).where(
                    Submission.submitted_at >= day_start, Submission.submitted_at < day_end
                )
            )
            submissions = r.scalar() or 0
            r = await self.db.execute(
                select(func.count(func.distinct(Submission.user_id))).where(
                    Submission.submitted_at >= day_start, Submission.submitted_at < day_end
                )
            )
            active_users = r.scalar() or 0
            data.append({
                "date": day.isoformat(),
                "new_users": new_users,
                "active_users": active_users,
                "submissions": submissions,
            })
        return data
    async def get_lessons_list(self, page=1, page_size=20, language_id=None):
        q = select(Lesson).order_by(Lesson.id)
        if language_id: q = q.where(Lesson.language_id == language_id)
        r = await self.db.execute(q.offset((page-1)*page_size).limit(page_size))
        cr = await self.db.execute(select(func.count()).select_from(Lesson))
        return {"items": [{"id": l.id, "title": l.title, "slug": l.slug, "difficulty": l.difficulty, "language_id": l.language_id, "order": l.order, "xp_reward": l.xp_reward, "is_active": l.is_active} for l in r.scalars().all()], "total": cr.scalar() or 0, "page": page, "page_size": page_size}
    async def get_users_list(self, page=1, page_size=20, search=None):
        q = select(User).order_by(User.id)
        cq = select(func.count()).select_from(User)
        if search:
            q = q.where(or_(User.username.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
            cq = cq.where(or_(User.username.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
        r = await self.db.execute(q.offset((page-1)*page_size).limit(page_size))
        cr = await self.db.execute(cq)
        return {"items": [{"id": u.id, "username": u.username, "email": u.email, "level": u.level, "xp": u.xp, "is_banned": u.is_banned, "created_at": u.created_at.isoformat() if u.created_at else None} for u in r.scalars().all()], "total": cr.scalar() or 0, "page": page, "page_size": page_size}
    async def get_user_detail(self, user_id):
        r = await self.db.execute(select(User).where(User.id == user_id))
        user = r.scalars().first()
        if not user:
            return None
        # Get progress summary
        pr = await self.db.execute(
            select(Progress).where(Progress.user_id == user_id).limit(10)
        )
        progress_list = [
            {"lesson_id": p.lesson_id, "status": p.status, "best_score": p.best_score}
            for p in pr.scalars().all()
        ]
        # Get recent submissions
        sr = await self.db.execute(
            select(Submission).where(Submission.user_id == user_id)
            .order_by(Submission.submitted_at.desc()).limit(10)
        )
        submissions_list = [
            {"id": s.id, "lesson_id": s.lesson_id, "status": s.status,
             "score": s.score, "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None}
            for s in sr.scalars().all()
        ]
        return {
            "id": user.id, "username": user.username, "email": user.email,
            "avatar": user.avatar, "level": user.level, "xp": user.xp,
            "streak_days": user.streak_days, "is_banned": user.is_banned,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "progress_summary": progress_list,
            "recent_submissions": submissions_list,
        }
    async def ban_user(self, user_id, is_banned, reason=None):
        r = await self.db.execute(select(User).where(User.id == user_id))
        u = r.scalars().first()
        if u:
            u.is_banned = is_banned
            u.banned_reason = reason
    async def get_submissions_list(self, page=1, page_size=20, user_id=None, lesson_id=None, status=None, search=None):
        from sqlalchemy.orm import joinedload
        from app.models.user import User
        from app.models.lesson import Lesson
        q = select(Submission).options(joinedload(Submission.user), joinedload(Submission.lesson)).order_by(Submission.id.desc())
        if user_id: q = q.where(Submission.user_id == user_id)
        if lesson_id: q = q.where(Submission.lesson_id == lesson_id)
        if status: q = q.where(Submission.status == status)
        if search:
            q = q.join(Submission.user).where(User.username.ilike(f"%{search}%"))
        cq = select(func.count(Submission.id))
        if user_id: cq = cq.where(Submission.user_id == user_id)
        if lesson_id: cq = cq.where(Submission.lesson_id == lesson_id)
        if status: cq = cq.where(Submission.status == status)
        if search:
            cq = cq.join(Submission.user).where(User.username.ilike(f"%{search}%"))
        r = await self.db.execute(q.offset((page-1)*page_size).limit(page_size))
        cr = await self.db.execute(cq)
        submissions = r.unique().scalars().all()
        return {"items": [{"id": s.id, "user_id": s.user_id, "username": s.user.username if s.user else None, "lesson_id": s.lesson_id, "lesson_title": s.lesson.title if s.lesson else None, "language": s.language, "status": s.status, "score": s.score, "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None} for s in submissions], "total": cr.scalar() or 0, "page": page, "page_size": page_size}
    async def get_all_settings(self):
        r = await self.db.execute(select(SystemSettings))
        return {s.key: {"value": s.value, "description": s.description} for s in r.scalars().all()}
    async def update_setting(self, key, value, admin_id):
        r = await self.db.execute(select(SystemSettings).where(SystemSettings.key == key))
        s = r.scalars().first()
        if not s:
            s = SystemSettings(key=key, value=value)
            self.db.add(s)
        else:
            s.value = value
        s.updated_by = admin_id
    async def log_action(self, admin_id, action, entity_type, entity_id, old_value=None, new_value=None):
        log = ContentAuditLog(admin_id=admin_id, action=action, entity_type=entity_type, entity_id=entity_id, old_value=old_value, new_value=new_value)
        self.db.add(log)
        return log
