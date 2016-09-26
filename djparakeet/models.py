from __future__ import unicode_literals

from django.db import models
from django.utils.translation import ugettext_lazy as _
from django.conf import settings


class Topic(models.Model):
    created_at = models.DateTimeField(_("Creation time"), auto_now_add=True)
    is_public = models.BooleanField(_("Is public"), default=True)
    name = models.CharField(_("Topic name"), max_length=255, blank=True, default='', help_text = _("Term name"))

    def __unicode__(self):
        return self.name    

    class Meta:
        verbose_name = _("Topic")
        verbose_name_plural = _("Topics")


class Message(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, verbose_name=_('Author'), help_text=_('Author'), related_name='messages')
    created_at = models.DateTimeField(_("Creation time"), auto_now_add=True)
    text = models.TextField(_("Text"), blank=True)
    topic = models.ForeignKey(Topic, verbose_name=_('Topic'), related_name='messages')

    class Meta:
        verbose_name = _("Message")
        verbose_name_plural = _("Message")
        ordering = ['-id']
