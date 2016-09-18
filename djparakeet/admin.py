from django.contrib import admin

from .models import Topic

class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_public',)

admin.site.register(Topic, TopicAdmin)
