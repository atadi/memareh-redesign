'use client'

import { useState } from 'react'
import { 
  Calendar,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { faIR } from 'date-fns/locale'

interface TimeSlotPickerProps {
  register: any
  errors: any
  setValue: any
  watch: any
}

export function TimeSlotPicker({ register, errors, setValue, watch }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const isEmergency = watch('isEmergency')

  const timeSlots = [
    { value: '08:00-10:00', label: '۸ تا ۱۰ صبح' },
    { value: '10:00-12:00', label: '۱۰ تا ۱۲ ظهر' },
    { value: '12:00-14:00', label: '۱۲ تا ۲ بعدظهر' },
    { value: '14:00-16:00', label: '۲ تا ۴ بعدظهر' },
    { value: '16:00-18:00', label: '۴ تا ۶ عصر' },
    { value: '18:00-20:00', label: '۶ تا ۸ شب' },
  ]

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 6 }), // Saturday
    end: endOfWeek(currentWeek, { weekStartsOn: 6 })
  })

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setValue('date', date)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setValue('timeSlot', time)
  }

  const goToNextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7))
  }

  const goToPrevWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7))
  }

  const persianWeekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 
    'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر',
    'دی', 'بهمن', 'اسفند'
  ]

  if (isEmergency) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">درخواست اضطراری</h2>
          <p className="text-gray-600">
            درخواست شما به صورت اضطراری ثبت خواهد شد
          </p>
        </div>

        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
            <div>
              <h3 className="font-bold text-red-800 mb-2">
                خدمات اضطراری ۲۴ ساعته
              </h3>
              <p className="text-red-700">
                تکنسین در کمترین زمان ممکن (معمولا کمتر از ۱ ساعت) به محل شما اعزام خواهد شد.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-red-600">
                  • هزینه ایاب و ذهاب اضطراری: ۵۰،۰۰۰ تومان
                </p>
                <p className="text-sm text-red-600">
                  • ضریب خدمات اضطراری: ۱.۵ برابر نرخ عادی
                </p>
              </div>
            </div>
          </div>
        </div>

        <input type="hidden" {...register('date')} value={new Date().toISOString()} />
        <input type="hidden" {...register('timeSlot')} value="emergency" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">انتخاب تاریخ و زمان</h2>
        <p className="text-gray-600">
          لطفا تاریخ و ساعت مناسب برای مراجعه تکنسین را انتخاب کنید
        </p>
      </div>

      {/* Emergency Service Toggle */}
      <div className="bg-orange-50 p-4 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('isEmergency')}
            className="w-5 h-5 text-orange-600 rounded"
          />
          <div>
            <p className="font-medium">درخواست اضطراری</p>
            <p className="text-sm text-gray-600">
              نیاز به خدمات فوری دارم (با هزینه اضافی)
            </p>
          </div>
        </label>
      </div>

      {/* Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">انتخاب تاریخ</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {persianWeekDays.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          
          {weekDays.map(day => {
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            const isPast = day < new Date() && !isToday
            
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => !isPast && handleDateSelect(day)}
                disabled={isPast}
                className={`
                  p-3 rounded-lg transition-all
                  ${isSelected 
                    ? 'bg-blue-500 text-white' 
                    : isToday
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : isPast
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'hover:bg-gray-100'
                  }
                `}
              >
                <div className="text-sm font-medium">
                  {format(day, 'd')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div>
          <h3 className="font-medium mb-3">انتخاب بازه زمانی</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {timeSlots.map(slot => {
              const isSelected = selectedTime === slot.value
              
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => handleTimeSelect(slot.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <Clock className="w-4 h-4" />
                  <span>{slot.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected DateTime Display */}
      {selectedDate && selectedTime && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                زمان انتخاب شده:
              </p>
              <p className="text-green-700">
                {format(selectedDate, 'EEEE d MMMM', { locale: faIR })} - {timeSlots.find(s => s.value === selectedTime)?.label}
              </p>
            </div>
          </div>
        </div>
      )}

      <input type="hidden" {...register('date')} />
      <input type="hidden" {...register('timeSlot')} />
      
      {errors.date && (
        <p className="text-red-500 text-sm">{errors.date.message}</p>
      )}
      {errors.timeSlot && (
        <p className="text-red-500 text-sm">{errors.timeSlot.message}</p>
      )}
    </div>
  )
}