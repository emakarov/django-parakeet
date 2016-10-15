from django.contrib import admin

from .models import Topic, Message

class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_public',)

class MessageAdmin(admin.ModelAdmin):
    list_display = ('author', 'created_at',)


admin.site.register(Topic, TopicAdmin)
admin.site.register(Message, MessageAdmin)
