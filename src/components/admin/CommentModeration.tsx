"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { revalidateArticle } from "@/actions/revalidate";
import {
  Check,
  X,
  Trash2,
  MessageCircle,
  AlertCircle,
  Clock,
  User,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { format } from "date-fns-jalali";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  status: "pending" | "approved" | "rejected";
  content: string;
  created_at: string;
  rejection_reason?: string;
  article: {
    title: string;
    slug: string;
  };
  user: {
    full_name: string;
    avatar_url?: string;
  };
  parent?: {
    content: string;
    user: {
      full_name: string;
    };
  };
}

interface CommentModerationProps {
  onStatusChange?: () => void;
}

export function CommentModeration({ onStatusChange }: CommentModerationProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">(
    "pending",
  );
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const COMMENTS_PER_PAGE = 10;
  const supabase = createClient();

  useEffect(() => {
    loadComments();
  }, [filter]);

  const loadComments = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("article_comments")
      .select(
        `
        *,
        article:articles(title, slug)
      `,
      )
      .eq("status", filter)
      .order("created_at", { ascending: false });

    if (data) {
      // Check which users are admin/staff
      const userIds = Array.from(
        new Set(data.map((c) => c.user_id).filter(Boolean)),
      );
      const { data: adminCheck } = await supabase
        .rpc('check_admin_users', { user_ids: userIds })
      const adminMap = Object.fromEntries(
        (adminCheck ?? []).filter((a: { is_admin: boolean }) => a.is_admin).map((a: { user_id: string }) => [a.user_id, true]),
      );

      // Fetch user profiles for each comment
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.id, p]),
      );

      // Also fetch parent comment info
      const parentIds = data.filter((c) => c.parent_id).map((c) => c.parent_id);
      let parentMap: Record<string, any> = {};
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from("article_comments")
          .select("id, content, user_id, guest_name")
          .in("id", parentIds);
        if (parents) {
          const parentUserIds = [...new Set(parents.map((p) => p.user_id).filter(Boolean))];
          const { data: parentProfiles } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", parentUserIds);
          const parentProfileMap = Object.fromEntries(
            (parentProfiles ?? []).map((p) => [p.id, p.display_name]),
          );
          parentMap = Object.fromEntries(
            parents.map((p) => {
              let full_name: string
              if (p.user_id) {
                full_name = parentProfileMap[p.user_id] || (adminMap[p.user_id] ? "گروه معماره" : "کاربر")
              } else {
                full_name = p.guest_name?.trim() ? `${p.guest_name.trim()} (مهمان)` : "کاربر مهمان"
              }
              return [
                p.id,
                {
                  content: p.content,
                  user: { full_name },
                },
              ]
            }),
          );
        }
      }

      const enriched = data.map((c) => {
        let full_name: string
        let avatar_url: string | null = null
        if (c.user_id) {
          full_name = profileMap[c.user_id]?.display_name || (adminMap[c.user_id] ? "گروه معماره" : "کاربر")
          avatar_url = profileMap[c.user_id]?.avatar_url || null
        } else {
          full_name = c.guest_name?.trim() ? `${c.guest_name.trim()} (مهمان)` : "کاربر مهمان"
        }

        return {
          ...c,
          user: { full_name, avatar_url },
          parent: c.parent_id ? parentMap[c.parent_id] : null,
        }
      });
      setComments(enriched);
    }
    setLoading(false);
  };

  const handleApprove = async (commentId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("article_comments")
      .update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", commentId);

    if (!error) {
      toast.success("نظر تایید شد");
      const comment = comments.find((c) => c.id === commentId);
      if (comment?.article?.slug) revalidateArticle(comment.article.slug);
      setComments(comments.filter((c) => c.id !== commentId));
      onStatusChange?.();
    }
  };

  const handleReject = async (commentId: string, reason?: string) => {
    const { error } = await supabase
      .from("article_comments")
      .update({
        status: "rejected",
        rejection_reason: reason,
      })
      .eq("id", commentId);

    if (!error) {
      toast.success("نظر رد شد");
      const comment = comments.find((c) => c.id === commentId);
      if (comment?.article?.slug) revalidateArticle(comment.article.slug);
      setComments(comments.filter((c) => c.id !== commentId));
      onStatusChange?.();
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("آیا از حذف این نظر اطمینان دارید؟")) return;

    const { error } = await supabase
      .from("article_comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      toast.success("نظر حذف شد");
      const comment = comments.find((c) => c.id === commentId);
      if (comment?.article?.slug) revalidateArticle(comment.article.slug);
      setComments(comments.filter((c) => c.id !== commentId));
      onStatusChange?.();
    }
  };

  const stats = {
    pending: comments.filter((c) => c.status === "pending").length,
    approved: comments.filter((c) => c.status === "approved").length,
    rejected: comments.filter((c) => c.status === "rejected").length,
  };

  const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);
  const paginatedComments = comments.slice(
    (currentPage - 1) * COMMENTS_PER_PAGE,
    currentPage * COMMENTS_PER_PAGE,
  );

  const handleFilterChange = (newFilter: "pending" | "approved" | "rejected") => {
    setCurrentPage(1);
    setFilter(newFilter);
  };

  return (
    <div className="pt-14 px-4">
      <div className="bg-white rounded-xl shadow-lg p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          مدیریت نظرات مقالات
        </h2>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange("pending")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <Clock className="w-4 h-4" />
            در انتظار ({stats.pending})
          </button>
          <button
            onClick={() => handleFilterChange("approved")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === "approved"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <Check className="w-4 h-4" />
            تایید شده
          </button>
          <button
            onClick={() => handleFilterChange("rejected")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              filter === "rejected"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            <X className="w-4 h-4" />
            رد شده
          </button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p>نظری برای نمایش وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedComments.map((comment) => (
            <div
              key={comment.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Comment Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {comment.user.full_name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(
                        new Date(comment.created_at),
                        "dd MMMM yyyy - HH:mm",
                      )}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    مقاله:
                    <a
                      href={`/articles/${comment.article.slug}`}
                      target="_blank"
                      className="text-blue-600 hover:underline mr-1"
                    >
                      {comment.article.title}
                    </a>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    comment.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : comment.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {comment.status === "pending" && "در انتظار"}
                  {comment.status === "approved" && "تایید شده"}
                  {comment.status === "rejected" && "رد شده"}
                </span>
              </div>

              {/* Parent Comment (if reply) */}
              {comment.parent && (
                <div className="bg-gray-50 p-3 rounded mb-3 text-sm">
                  <span className="text-gray-600">در پاسخ به: </span>
                  <span className="font-medium">
                    {comment.parent.user.full_name}
                  </span>
                  <p className="mt-1 text-gray-700">{comment.parent.content}</p>
                </div>
              )}

              {/* Comment Content */}
              <div className="bg-gray-50 p-4 rounded-lg mb-3">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {comment.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(comment.id)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      تایید
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt("دلیل رد نظر (اختیاری):");
                        handleReject(
                          comment.id,
                          reason === null ? undefined : reason,
                        );
                      }}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      رد
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              </div>

              {/* Rejection Reason (if rejected) */}
              {comment.status === "rejected" && comment.rejection_reason && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm">
                  <span className="text-red-700 font-medium">دلیل رد: </span>
                  <span className="text-red-600">
                    {comment.rejection_reason}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <span className="text-sm text-gray-600">
            نمایش {((currentPage - 1) * COMMENTS_PER_PAGE) + 1} تا {Math.min(currentPage * COMMENTS_PER_PAGE, comments.length)} از {comments.length} نظر
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
