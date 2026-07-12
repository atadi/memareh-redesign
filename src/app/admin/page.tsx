"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Newspaper,
  MessageCircle,
  FileText,
  ChevronLeft,
  LayoutDashboard,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Menu,
  LogOut,
} from "lucide-react";
import { ArticleModeration } from "@/components/admin/ArticleModeration";
import { UserModeration } from "@/components/admin/UserModeration";
import { CommentModeration } from "@/components/admin/CommentModeration";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedCount: 0,
    draftCount: 0,
    totalViews: 0,
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { count: pending } = await supabase
      .from("article_comments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (pending !== null) setPendingCount(pending);

    const { count: totalArticles } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true });

    const { count: publishedCount } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    const { count: draftCount } = await supabase
      .from("articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft");

    const { data: viewsData } = await supabase.from("articles").select("views");

    const totalViews =
      viewsData?.reduce((sum, a) => sum + (a.views ?? 0), 0) ?? 0;

    setStats({
      totalArticles: totalArticles ?? 0,
      publishedCount: publishedCount ?? 0,
      draftCount: draftCount ?? 0,
      totalViews,
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push('/admin/login')
      router.refresh()
    }
  };

  const menuItems: Array<{
    id: string;
    label: string;
    icon: typeof LayoutDashboard;
    isLink: boolean;
    href?: string;
    badge?: number;
  }> = [
    { id: "overview", label: "داشبورد", icon: LayoutDashboard, isLink: false },
    {
      id: "users",
      label: "کاربران",
      icon: Users,
      isLink: false,
    },
    {
      id: "articles",
      label: "مدیریت مقالات",
      icon: Newspaper,
      isLink: false,
    },
    {
      id: "comments",
      label: "مدیریت نظرات",
      icon: MessageCircle,
      isLink: false,
      badge: pendingCount,
    },
  ];

  const statsCards = [
    {
      label: "کل مقالات",
      value: stats.totalArticles,
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "منتشر شده",
      value: stats.publishedCount,
      icon: CheckCircle,
      color: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      label: "پیش‌نویس",
      value: stats.draftCount,
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      label: "بازدید کل",
      value: stats.totalViews,
      icon: Eye,
      color: "from-violet-500 to-violet-600",
      bgLight: "bg-violet-50",
      textColor: "text-violet-600",
    },
  ];

  return (
    <div className="flex h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-linear-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out shrink-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                پنل مدیریت
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">
                معماره
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isLink && "href" in item && item.href) {
                    router.push(item.href);
                  } else {
                    setActiveSection(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? "bg-linear-to-r from-blue-600/80 to-purple-600/80 text-white shadow-lg shadow-blue-600/20"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                } ${!sidebarOpen && "justify-center px-0"}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 shrink-0 ${isActive ? "scale-110" : "group-hover:scale-110"}`}
                />
                {sidebarOpen && (
                  <>
                    <span className="text-sm font-medium truncate">
                      {item.label}
                    </span>
                    {(item.badge ?? 0) > 0 && (
                      <span className="mr-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-5 text-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronLeft className="w-4 h-4 mr-auto opacity-70 shrink-0" />
                    )}
                  </>
                )}
                {!sidebarOpen && (item.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 ${!sidebarOpen && "justify-center px-0"}`}
            title={!sidebarOpen ? "خروج" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium">خروج</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeSection === "overview" && (
          <div className="pt-14 px-4 space-y-6">
            {/* Welcome */}
            <div>
              <h2 className="text-3xl font-bold text-gray-800">خوش آمدید 👋</h2>
              <p className="text-gray-500 mt-1">
                به پنل مدیریت معماره خوش آمدید
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
              {statsCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-500 font-medium">
                          {card.label}
                        </p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">
                          {card.value.toLocaleString("fa-IR")}
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-xl ${card.bgLight} transition-transform duration-300 group-hover:scale-110`}
                      >
                        <Icon className={`w-6 h-6 ${card.textColor}`} />
                      </div>
                    </div>
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-1 rounded-full bg-linear-to-r ${card.color} scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-right`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                دسترسی سریع
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveSection("articles")}
                  className="flex items-center gap-3 p-4 rounded-xl bg-linear-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
                >
                  <Newspaper className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-blue-700">
                    مدیریت مقالات
                  </span>
                </button>
                <button
                  onClick={() => setActiveSection("comments")}
                  className="flex items-center gap-3 p-4 rounded-xl bg-linear-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 transition-all duration-200 group"
                >
                  <MessageCircle className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-amber-700">
                    مدیریت نظرات
                    {pendingCount > 0 && (
                      <span className="mr-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setActiveSection("users")}
                  className="flex items-center gap-3 p-4 rounded-xl bg-linear-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 transition-all duration-200 group"
                >
                  <Users className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium text-emerald-700">
                    کاربران
                  </span>
                </button>
              </div>
            </div>

            {/* Pending Comments Alert */}
            {pendingCount > 0 && (
              <div className="bg-linear-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-100">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-red-800">
                      {pendingCount} نظر در انتظار تایید
                    </p>
                    <p className="text-sm text-red-600 mt-0.5">
                      نظرات جدید نیاز به بررسی و تایید دارند
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSection("comments")}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium shadow-lg shadow-red-600/20"
                >
                  مشاهده نظرات
                </button>
              </div>
            )}
          </div>
        )}

        {activeSection === "articles" && (
          <ArticleModeration onBack={() => setActiveSection("overview")} />
        )}
        {activeSection === "users" && <UserModeration />}
        {activeSection === "comments" && <CommentModeration onStatusChange={loadData} />}
      </main>
    </div>
  );
}
