"use client";
import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";


const PitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [language, setLanguage] = useState<'en' | 'id'>('en');

  const content = {
    en: {
      slides: [
        {
          title: "CoffeeLogica",
          subtitle: "Smart Coffee Roastery Management System",
          description: "Revolutionizing coffee production with intelligent inventory management, yield optimization, and waste reduction",
          type: "hero"
        },
        {
          title: "The Coffee Industry Challenge",
          subtitle: "Coffee roasters face significant operational challenges",
          points: [
            "22% profit loss due to poor inventory management",
            "90% of roasters experience frequent stockouts",
            "Manual tracking leads to 25% waste increase",
            "Lack of yield optimization costs $50K+ annually"
          ],
          type: "problem"
        },
        {
          title: "Meet CoffeeLogica",
          subtitle: "Your Complete Coffee Production Solution",
          description: "An intelligent SaaS platform designed specifically for coffee roasters to optimize operations, reduce waste, and maximize profitability",
          features: [
            "Smart Inventory Management",
            "Real-time Yield Analysis", 
            "Waste Tracking & Reduction",
            "Production Planning",
            "Quality Control",
            "Financial Analytics"
          ],
          type: "solution"
        },
        {
          title: "Dashboard Overview",
          subtitle: "Everything you need at a glance",
          description: "Real-time insights into your coffee roastery operations",
          type: "dashboard"
        },
        {
          title: "Key Features",
          subtitle: "Comprehensive tools for modern coffee roasters",
          features: [
            {
              icon: "📦",
              title: "Smart Inventory",
              description: "Automated tracking of green beans, supplies, and finished products"
            },
            {
              icon: "📊",
              title: "Yield Analytics", 
              description: "Optimize roasting efficiency with detailed yield analysis"
            },
            {
              icon: "🗑️",
              title: "Waste Reduction",
              description: "Track and minimize waste with intelligent categorization"
            },
            {
              icon: "📈",
              title: "Production Planning",
              description: "Schedule roasts and manage capacity efficiently"
            }
          ],
          type: "features"
        },
        {
          title: "Proven Results",
          subtitle: "Real impact for coffee roasters",
          stats: [
            { number: "65%", label: "Reduction in inventory losses" },
            { number: "40%", label: "Improvement in yield efficiency" },
            { number: "75%", label: "Time saved on manual tracking" },
            { number: "90%", label: "Reduction in stockouts" }
          ],
          type: "results"
        },
        {
          title: "Flexible Pricing",
          subtitle: "Plans that grow with your business",
          plans: [
            {
              name: "Free",
              price: "Rp 0",
              period: "/month",
              features: ["Up to 1 user", "Up to 5 batches", "Basic reporting"]
            },
            {
              name: "Starter", 
              price: "Rp 160.000",
              period: "/month",
              features: ["Up to 5 users", "Up to 50 recipes", "Up to 100 batches", "Basic Analytic","Email support"],
              popular: true
            },
            {
              name: "Professional",
              price: "Rp 235.000",
              period: "/month",
              features: ["Up to 15 users","Up to 100 ingridients","Advance Reporting","Advance Analytics","Priority Support"]
            }
          ],
          type: "pricing"
        },
        {
          title: "Ready to Transform Your Roastery?",
          subtitle: "Join leading coffee roasters using CoffeeLogica",
          cta: "Start Your Free Trial",
          contact: "Contact us: hello@coffeelogica.com",
          type: "cta"
        }
      ]
    },
    id: {
      slides: [
        {
          title: "CoffeeLogica",
          subtitle: "Sistem Manajemen Roastery Kopi Cerdas",
          description: "Merevolusi produksi kopi dengan manajemen inventori cerdas, optimasi hasil, dan pengurangan limbah",
          type: "hero"
        },
        {
          title: "Tantangan Industri Kopi",
          subtitle: "Roaster kopi menghadapi tantangan operasional yang signifikan",
          points: [
            "22% kerugian profit akibat manajemen inventori yang buruk",
            "90% roaster mengalami kehabisan stok secara berkala",
            "Pencatatan manual menyebabkan peningkatan limbah 25%",
            "Kurangnya optimasi hasil merugikan Rp 750 juta+ per tahun"
          ],
          type: "problem"
        },
        {
          title: "Kenalkan CoffeeLogica",
          subtitle: "Solusi Lengkap Produksi Kopi Anda",
          description: "Platform SaaS cerdas yang dirancang khusus untuk roaster kopi guna mengoptimalkan operasi, mengurangi limbah, dan memaksimalkan profitabilitas",
          features: [
            "Manajemen Inventori Cerdas",
            "Analisis Hasil Real-time",
            "Pelacakan & Pengurangan Limbah", 
            "Perencanaan Produksi",
            "Kontrol Kualitas",
            "Analitik Keuangan"
          ],
          type: "solution"
        },
        {
          title: "Tampilan Dashboard",
          subtitle: "Semua yang Anda butuhkan dalam satu pandangan",
          description: "Wawasan real-time tentang operasi roastery kopi Anda",
          type: "dashboard"
        },
        {
          title: "Fitur Utama",
          subtitle: "Alat komprehensif untuk roaster kopi modern",
          features: [
            {
              icon: "📦",
              title: "Inventori Cerdas",
              description: "Pelacakan otomatis green bean, supplies, dan produk jadi"
            },
            {
              icon: "📊", 
              title: "Analitik Hasil",
              description: "Optimasi efisiensi roasting dengan analisis hasil detail"
            },
            {
              icon: "🗑️",
              title: "Pengurangan Limbah",
              description: "Lacak dan minimalisir limbah dengan kategorisasi cerdas"
            },
            {
              icon: "📈",
              title: "Perencanaan Produksi",
              description: "Jadwalkan roasting dan kelola kapasitas secara efisien"
            }
          ],
          type: "features"
        },
        {
          title: "Hasil Terbukti",
          subtitle: "Dampak nyata untuk roaster kopi",
          stats: [
            { number: "65%", label: "Pengurangan kerugian inventori" },
            { number: "40%", label: "Peningkatan efisiensi hasil" },
            { number: "75%", label: "Waktu tersimpan dari pencatatan manual" },
            { number: "90%", label: "Pengurangan kehabisan stok" }
          ],
          type: "results"
        },
        {
          title: "Harga Fleksibel",
          subtitle: "Paket yang berkembang bersama bisnis Anda",
          plans: [
            {
              name: "Free",
              price: "Rp 0",
              period: "/bulan",
              features: ["1 user", "Hingga 5 batch", "Laporan dasar"]              
            },
            {
              name: "Starter",
              price: "Rp 160.000", 
              period: "/bulan",
              features: ["Hingga 5 user", "Hingga 5 resep", "Hingga 100 batch", "Analitik dasar","Dukungan email"],              
              popular: true
            },
            {
              name: "Professional",
              price: "Rp 235.000",
              period: "/bulan",
              features: ["Hingga 15 user", "Hingga 100 bahan", "Laporan lanjutan", "Analitik lanjutan","Dukungan prioritas"]              
            }
          ],
          type: "pricing"
        },
        {
          title: "Siap Transformasi Roastery Anda?",
          subtitle: "Bergabunglah dengan roaster kopi terdepan yang menggunakan CoffeeLogica",
          cta: "Mulai Uji Coba Gratis",
          contact: "Hubungi kami: hello@coffeelogica.com",
          type: "cta"
        }
      ]
    }
  };

  const totalSlides = content[language].slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        nextSlide();
      } else if (event.key === "ArrowLeft") {
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderSlide = (slide: any) => {
    switch (slide.type) {
      case "hero":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto text-center">
              {/* Logo */}
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all duration-300 p-2">
                  <Image
                    src="/logo-polos.png"
                    alt="CoffeeLogica Logo"
                    width={120}
                    height={120}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <h1 className="text-4xl md:text-7xl font-bold text-gray-900 mb-6 animate-fade-in">
                {slide.title}
              </h1>
              <h2 className="text-xl md:text-3xl text-amber-700 mb-8 font-medium animate-fade-in-delay">
                {slide.subtitle}
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed animate-fade-in-delay-2">
                {slide.description}
              </p>
              <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/signup?plan=free" className="bg-amber-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-700 transform hover:scale-105 transition-all duration-300 shadow-lg cursor-pointer text-center">
                  {language === 'en' ? 'Start Free Trial' : 'Mulai Uji Coba Gratis'}
                </Link>
                <Link href="/demo" className="border-2 border-amber-600 text-amber-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-50 transform hover:scale-105 transition-all duration-300 cursor-pointer text-center">
                  {language === 'en' ? 'Watch Demo' : 'Lihat Demo'}
                </Link>
              </div>
            </div>
          </div>
        );

      case "problem":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-red-700 font-medium">
                  {slide.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {slide.points.map((point: string, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border-l-4 border-red-500 transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-start">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-4 mt-1">
                        <span className="text-white font-bold">!</span>
                      </div>
                      <p className="text-lg md:text-xl text-gray-800 leading-relaxed">{point}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "solution":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-green-700 font-medium mb-8">
                  {slide.subtitle}
                </p>
                <p className="text-lg md:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  {slide.description}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {slide.features.map((feature: string, idx: number) => (
                  <div key={idx} className="bg-white p-4 md:p-6 rounded-xl shadow-lg text-center transform hover:scale-105 transition-all duration-300 border-2 border-green-200 hover:border-green-400">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-xl md:text-2xl">✓</span>
                    </div>
                    <h3 className="text-sm md:text-lg font-semibold text-gray-800">{feature}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "dashboard":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto w-full">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-blue-700 font-medium mb-8">
                  {slide.subtitle}
                </p>
                <p className="text-lg md:text-xl text-gray-600">
                  {slide.description}
                </p>
              </div>
              {/* Dashboard Screenshot */}
              <div className="bg-white rounded-2xl shadow-2xl p-4 md:p-8 border hover-lift relative">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl h-64 md:h-96 flex items-center justify-center relative overflow-hidden">
                  <Image 
                    src="/dashboard_ss.png" 
                    alt="Dashboard Screenshot" 
                    fill
                    className="object-contain p-2"
                    priority
                  />
                </div>
                
                {/* Floating elements for visual appeal */}
                <div className="absolute top-4 right-4 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-6 left-6 w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>              
            </div>
          </div>
        );

      case "features":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-purple-700 font-medium">
                  {slide.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {slide.features.map((feature: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 border-2 border-purple-200 hover:border-purple-400">
                    <div className="flex items-start">
                      <div className="text-4xl md:text-5xl mr-6 mt-2">{feature.icon}</div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                        <p className="text-gray-600 text-base md:text-lg leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "results":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-emerald-700 font-medium">
                  {slide.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {slide.stats.map((stat: any, idx: number) => (
                  <div key={idx} className="bg-white p-6 md:p-8 rounded-2xl shadow-lg text-center transform hover:scale-105 transition-all duration-300 border-2 border-emerald-200">
                    <div className="text-3xl md:text-5xl font-bold text-emerald-600 mb-4">{stat.number}</div>
                    <p className="text-gray-700 text-sm md:text-base font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "pricing":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-indigo-700 font-medium">
                  {slide.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {slide.plans.map((plan: any, idx: number) => (
                  <div key={idx} className={`bg-white p-6 md:p-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 ${plan.popular ? 'border-4 border-indigo-500 relative' : 'border-2 border-gray-200'}`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                          {language === 'en' ? 'Most Popular' : 'Terpopuler'}
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                      <div className="mb-6">
                        <span className="text-3xl md:text-4xl font-bold text-indigo-600">{plan.price}</span>
                        <span className="text-gray-600">{plan.period}</span>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature: string, featureIdx: number) => (
                          <li key={featureIdx} className="flex items-center text-gray-700">
                            <span className="text-green-500 mr-3">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Link 
                        href={`/auth/signup?plan=${plan.name.toLowerCase()}&cycle=monthly`}
                        className={`cursor-pointer block w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        {language === 'en' ? 'Choose Plan' : 'Pilih Paket'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "cta":
        return (
          <div className="slide min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-6">
                {slide.title}
              </h1>
              <p className="text-lg md:text-2xl text-amber-700 font-medium mb-12">
                {slide.subtitle}
              </p>
              <div className="mb-12">                
                <Link href="/auth/signup?plan=free" className="bg-amber-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-700 transform hover:scale-105 transition-all duration-300 shadow-lg cursor-pointer text-center cursor-pointer">
                  {language === 'en' ? 'Start Free Trial' : 'Mulai Uji Coba Gratis'}
                </Link>
              </div>
              <div className="space-y-4">
                <p className="text-lg md:text-xl text-gray-600">{slide.contact}</p>
                <div className="flex justify-center space-x-6">
                  <a href="/demo" className="text-amber-600 hover:text-amber-700 text-lg font-semibold">
                    {language === 'en' ? 'Schedule Demo' : 'Jadwalkan Demo'}
                  </a>
                  <a href="/" className="text-amber-600 hover:text-amber-700 text-lg font-semibold">
                    {language === 'en' ? 'Learn More' : 'Pelajari Lebih Lanjut'}
                  </a>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pitch-deck relative overflow-hidden">
      {/* Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white rounded-full shadow-lg p-2 flex">
          <button
            onClick={() => setLanguage('en')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              language === 'en' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('id')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              language === 'id' ? 'bg-amber-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ID
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="slides-container">
        {content[language].slides.map((slide, index) => (
          <div
            key={index}
            className={`slide-wrapper transition-all duration-700 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 translate-x-0'
                : index < currentSlide
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
            }`}
            style={{
              position: index === currentSlide ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              width: '100%',
            }}
          >
            {renderSlide(slide)}
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-full shadow-lg p-2 flex items-center space-x-2">
          <button
            onClick={prevSlide}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={currentSlide === 0}
          >
            <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex space-x-2">
            {content[language].slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide ? 'bg-amber-600' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
          <button
            onClick={nextSlide}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={currentSlide === totalSlides - 1}
          >
            <ChevronRightIcon className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Slide Counter */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white rounded-full shadow-lg px-4 py-2">
          <span className="text-sm font-semibold text-gray-600">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }
        .animate-fade-in-delay {
          animation: fadeIn 1s ease-out 0.3s both;
        }
        .animate-fade-in-delay-2 {
          animation: fadeIn 1s ease-out 0.6s both;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .slide-wrapper {
          min-height: 100vh;
        }
      `}</style>
    </div>
  );
};

export default PitchDeck;